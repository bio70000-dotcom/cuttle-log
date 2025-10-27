import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, WMSTileLayer } from 'react-leaflet';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Locate, MapPin, List } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for marker icons in Vite
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = '';

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function MapClickHandler({ isAddingSpot, onMapClick }: { isAddingSpot: boolean; onMapClick: (e: L.LeafletMouseEvent) => void }) {
  const map = useMap();
  useEffect(() => {
    if (isAddingSpot) {
      map.on('click', onMapClick);
    } else {
      map.off('click', onMapClick);
    }
    return () => { map.off('click', onMapClick); };
  }, [isAddingSpot, map, onMapClick]);
  return null;
}

export default function MapPage() {
  const { position } = useGeolocation();
  const [center, setCenter] = useState<[number, number]>([36.5, 127.8]);
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [showSpotList, setShowSpotList] = useState(false);
  const { toast } = useToast();

  const trips = useLiveQuery(() => db.trips.filter(t => t.lat != null && t.lng != null).toArray(), []) || [];
  const spots = useLiveQuery(() => db.spots.toArray(), []) || [];

  const vworldKey = '16F0D487-31DC-3C29-8C19-B91602D05200';

  useEffect(() => {
    if (position) setCenter([position.lat, position.lng]);
  }, [position]);

  const handleLocate = () => {
    if (position) {
      setCenter([position.lat, position.lng]);
      toast({ title: '현재 위치로 이동했습니다' });
    } else {
      toast({ title: '위치를 찾을 수 없습니다', description: '위치 권한을 확인해주세요', variant: 'destructive' });
    }
  };

  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    if (!isAddingSpot) return;
    const { lat, lng } = e.latlng;
    const name = prompt('포인트 이름을 입력하세요:');
    if (name) {
      try {
        await db.spots.add({ name, lat, lng, createdAt: new Date() });
        toast({ title: '포인트가 저장되었습니다', description: name });
        setIsAddingSpot(false);
      } catch (error) {
        toast({ title: '포인트 저장 실패', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="fixed inset-0 pb-16">
      <div className="fixed top-4 left-4 right-4 z-[1000] flex gap-2 flex-wrap">
        <Button onClick={handleLocate} size="sm" className="shadow-lg">
          <Locate className="w-4 h-4 mr-1" />내 위치
        </Button>
        <Button onClick={() => setIsAddingSpot(!isAddingSpot)} size="sm" variant={isAddingSpot ? 'default' : 'outline'} className="shadow-lg">
          <MapPin className="w-4 h-4 mr-1" />{isAddingSpot ? '취소' : '포인트 추가'}
        </Button>
        <Button onClick={() => setShowSpotList(!showSpotList)} size="sm" variant="outline" className="shadow-lg">
          <List className="w-4 h-4 mr-1" />포인트 목록 ({spots.length})
        </Button>
      </div>

      {showSpotList && (
        <Card className="fixed top-20 left-4 right-4 z-[1000] max-h-[40vh] overflow-auto p-4 shadow-lg">
          <h3 className="font-semibold mb-3">저장된 포인트</h3>
          {spots.length === 0 ? (
            <p className="text-sm text-muted-foreground">저장된 포인트가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {spots.map((spot) => (
                <Button key={spot.id} variant="outline" className="w-full justify-start" onClick={() => { setCenter([spot.lat, spot.lng]); setShowSpotList(false); }}>
                  <MapPin className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">{spot.name || '이름 없음'}</div>
                    <div className="text-xs text-muted-foreground">{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="absolute inset-0">
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }} maxBounds={[[33.0, 124.0], [38.8, 132.1]]} maxBoundsViscosity={0.8}>
          <MapController center={center} />
          <MapClickHandler isAddingSpot={isAddingSpot} onMapClick={handleMapClick} />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="기본지도">
              <TileLayer attribution="© VWorld / 국토지리정보원" url={`https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/Base/{z}/{y}/{x}.png`} maxZoom={19} />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="위성지도">
              <TileLayer attribution="© VWorld / 국토지리정보원" url={`https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/Satellite/{z}/{y}/{x}.jpeg`} maxZoom={19} />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay name="해양 정보">
              <WMSTileLayer url="https://www.khoa.go.kr/oceangrid/wms/map/map_wms.jsp" params={{ layers: 'KHOA:coastline', format: 'image/png', transparent: true }} attribution="© KHOA" />
            </LayersControl.Overlay>
          </LayersControl>
          {position && <Marker position={[position.lat, position.lng]}><Popup>현재 위치</Popup></Marker>}
          {trips.map((trip) => trip.lat && trip.lng ? <Marker key={trip.id} position={[trip.lat, trip.lng]}><Popup><p className="font-semibold">{trip.spotName || '출조 지점'}</p></Popup></Marker> : null)}
          {spots.map((spot) => <Marker key={spot.id} position={[spot.lat, spot.lng]}><Popup><p className="font-semibold">{spot.name}</p></Popup></Marker>)}
        </MapContainer>
      </div>
    </div>
  );
}
