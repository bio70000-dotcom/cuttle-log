import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useState, useRef } from 'react';
import { Navigation } from 'lucide-react';
import * as L from 'leaflet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLocationStore } from '@/stores/locationStore';
import { useWeatherStore } from '@/stores/weatherStore';
import { useTideStore } from '@/stores/tideStore';
import { reverseGeocode } from '@/lib/geocoding';
import ClientOnly from '@/components/ClientOnly';

function LocationButton() {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const { setCoords, setPlaceName } = useLocationStore();
  const refreshWeather = useWeatherStore((state) => state.refresh);
  const refreshTide = useTideStore((state) => state.refresh);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update global store immediately
        setCoords(latitude, longitude);
        
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        const marker = L.marker([latitude, longitude]).addTo(map);
        marker.bindPopup("현재 위치입니다.").openPopup();
        markerRef.current = marker;

        map.flyTo([latitude, longitude], 14);
        setLoading(false);
        toast.success("현재 위치를 찾았습니다.");

        // Reverse geocode and fetch weather asynchronously
        try {
          const placeName = await reverseGeocode(latitude, longitude);
          if (placeName) {
            setPlaceName(placeName);
          }
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
        }

        // Fetch weather data
        refreshWeather(latitude, longitude).catch((error) => {
          console.warn('Weather fetch failed:', error);
        });

        // Fetch tide data
        refreshTide(latitude, longitude).catch((error) => {
          console.warn('Tide fetch failed:', error);
        });
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

  return (
    <Button
      onClick={handleLocate}
      disabled={loading}
      className="absolute bottom-6 right-6 z-[1000] shadow-lg"
      size="lg"
    >
      <Navigation className="w-4 h-4 mr-2" />
      {loading ? '위치 찾는 중...' : '내 위치'}
    </Button>
  );
}

export default function MapPage() {
  return (
    <div className="fixed inset-0 pb-16" style={{ height: '100%', width: '100%' }}>
      <ClientOnly>
        <MapContainer 
          center={[36.5, 127.8]} 
          zoom={7} 
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationButton />
        </MapContainer>
      </ClientOnly>
    </div>
  );
}
