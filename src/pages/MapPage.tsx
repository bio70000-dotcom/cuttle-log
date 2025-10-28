import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useRef, useState, useEffect } from 'react';
import { Navigation, PlayCircle, StopCircle, Target } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { db } from '@/db/schema';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTripTracking } from '@/hooks/useTripTracking';
import ManualConditionsForm from '@/components/ManualConditionsForm';
import { queueForSync } from '@/lib/sync';

function MapControls() {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const hitMarkersRef = useRef<L.Marker[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConditionsForm, setShowConditionsForm] = useState(false);
  const { startTracking, stopTracking } = useTripTracking();

  // Get current trip
  const currentTrip = useLiveQuery(async () => {
    const trips = await db.trips.where('dateEnd').equals(undefined as any).toArray();
    return trips.length > 0 ? trips[0] : null;
  });

  // Load existing trackpoints and catches when trip is active
  useEffect(() => {
    if (!currentTrip) return;

    const loadTripData = async () => {
      // Load trackpoints
      const trackPoints = await db.trackPoints.where('tripId').equals(currentTrip.id!).toArray();
      if (trackPoints.length > 0) {
        const polyline = L.polyline(
          trackPoints.map(tp => [tp.lat, tp.lng] as [number, number]),
          { color: '#1976d2', weight: 4, opacity: 0.8 }
        ).addTo(map);
      }

      // Load catch markers
      const catches = await db.catchEvents.where('tripId').equals(currentTrip.id!).toArray();
      catches.forEach(catchEvent => {
        if (catchEvent.lat && catchEvent.lng) {
          const icon = L.divIcon({
            className: 'custom-hit-marker',
            html: '<div style="background: #f44336; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">H</div>',
            iconSize: [32, 32],
          });

          const marker = L.marker([catchEvent.lat, catchEvent.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <strong>히트!</strong><br/>
              시간: ${new Date(catchEvent.at).toLocaleTimeString('ko-KR')}<br/>
              위치: ${catchEvent.lat.toFixed(5)}, ${catchEvent.lng.toFixed(5)}
            `);
          
          hitMarkersRef.current.push(marker);
        }
      });
    };

    loadTripData();
  }, [currentTrip, map]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        const marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup("현재 위치입니다.").openPopup();
        markerRef.current = marker;

        map.flyTo([latitude, longitude], 14);
        setLoading(false);
        toast.success("현재 위치를 찾았습니다.");
      },
      (error) => {
        setLoading(false);
        toast.error("위치 정보를 가져올 수 없습니다.");
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleStartTrip = async () => {
    const tripId = await db.trips.add({
      dateStart: new Date(),
    });

    await queueForSync('trip', { id: tripId, dateStart: new Date() });
    await startTracking(map, tripId as number);
    
    toast.success('출조를 시작했습니다');
  };

  const handleEndTrip = async () => {
    if (!currentTrip?.id) return;

    await db.trips.update(currentTrip.id, {
      dateEnd: new Date(),
    });

    await queueForSync('trip', { id: currentTrip.id, dateEnd: new Date() });
    stopTracking();
    
    // Clear hit markers
    hitMarkersRef.current.forEach(marker => marker.remove());
    hitMarkersRef.current = [];

    toast.success('출조를 종료했습니다');
  };

  const handleAddHit = () => {
    if (!currentTrip?.id) {
      toast.error('출조를 먼저 시작해주세요');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const catchId = await db.catchEvents.add({
          tripId: currentTrip.id!,
          at: new Date(),
          lat: latitude,
          lng: longitude,
          rigSlot: 'A',
          egiSlot: 'A',
        });

        await queueForSync('catch', {
          id: catchId,
          tripId: currentTrip.id,
          at: new Date(),
          lat: latitude,
          lng: longitude,
        });

        // Add red marker
        const icon = L.divIcon({
          className: 'custom-hit-marker',
          html: '<div style="background: #f44336; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">H</div>',
          iconSize: [32, 32],
        });

        const marker = L.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <strong>히트!</strong><br/>
            시간: ${new Date().toLocaleTimeString('ko-KR')}<br/>
            위치: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
          `)
          .openPopup();

        hitMarkersRef.current.push(marker);
        toast.success('갑오징어 기록을 추가했습니다!');
      },
      (error) => {
        toast.error('위치 정보를 가져올 수 없습니다');
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSaveConditions = async (data: any) => {
    if (!currentTrip?.id) {
      toast.error('출조를 먼저 시작해주세요');
      return;
    }

    await db.conditions.add({
      tripId: currentTrip.id,
      at: new Date(),
      waterTemp: data.waterTemp,
      currentStrength: data.currentStrength,
      waterColor: data.waterColor,
    });

    toast.success('조건을 저장했습니다');
  };

  return (
    <>
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        {!currentTrip ? (
          <Button onClick={handleStartTrip} size="lg" className="shadow-lg">
            <PlayCircle className="w-4 h-4 mr-2" />
            출조 시작
          </Button>
        ) : (
          <>
            <Button onClick={handleEndTrip} variant="destructive" size="lg" className="shadow-lg">
              <StopCircle className="w-4 h-4 mr-2" />
              출조 종료
            </Button>
            <Button onClick={handleAddHit} size="lg" className="shadow-lg">
              <Target className="w-4 h-4 mr-2" />
              + 갑오징어 기록
            </Button>
            <Button onClick={() => setShowConditionsForm(true)} variant="outline" size="lg" className="shadow-lg">
              조건 입력
            </Button>
          </>
        )}
      </div>

      <Button
        onClick={handleLocate}
        disabled={loading}
        className="absolute bottom-6 right-6 z-[1000] shadow-lg"
        size="lg"
      >
        <Navigation className="w-4 h-4 mr-2" />
        {loading ? '위치 찾는 중...' : '내 위치'}
      </Button>

      <ManualConditionsForm
        open={showConditionsForm}
        onClose={() => setShowConditionsForm(false)}
        onSave={handleSaveConditions}
      />
    </>
  );
}

export default function MapPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, paddingBottom: '64px' }}>
      <MapContainer 
        center={[36.5, 127.8]} 
        zoom={7} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapControls />
      </MapContainer>
    </div>
  );
}
