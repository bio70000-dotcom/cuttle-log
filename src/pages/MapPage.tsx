import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, WMSTileLayer } from 'react-leaflet';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Locate, MapPin, List, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  
  return null;
}

function MapClickHandler({ 
  isAddingSpot, 
  onMapClick 
}: { 
  isAddingSpot: boolean; 
  onMapClick: (e: L.LeafletMouseEvent) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (isAddingSpot) {
      map.on('click', onMapClick);
    } else {
      map.off('click', onMapClick);
    }
    
    return () => {
      map.off('click', onMapClick);
    };
  }, [isAddingSpot, map, onMapClick]);
  
  return null;
}

export default function MapPage() {
  const { position } = useGeolocation();
  const [center, setCenter] = useState<[number, number]>([36.5, 127.8]); // Korea default
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotPosition, setNewSpotPosition] = useState<[number, number] | null>(null);
  const [showSpotList, setShowSpotList] = useState(false);
  const { toast } = useToast();

  const trips = useLiveQuery(() => 
    db.trips.filter(t => t.lat != null && t.lng != null).toArray(),
    []
  ) || [];

  const spots = useLiveQuery(() => db.spots.toArray(), []) || [];

  const vworldKey = '16F0D487-31DC-3C29-8C19-B91602D05200';
  const enableKHOA = localStorage.getItem('map_khoa_overlay') !== 'false';

  useEffect(() => {
    if (position) {
      setCenter([position.lat, position.lng]);
    }
  }, [position]);

  const handleLocate = () => {
    if (position) {
      setCenter([position.lat, position.lng]);
      toast({
        title: '현재 위치로 이동했습니다',
      });
    } else {
      toast({
        title: '위치를 찾을 수 없습니다',
        description: '위치 권한을 확인해주세요',
        variant: 'destructive',
      });
    }
  };

  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    if (!isAddingSpot) return;
    
    const { lat, lng } = e.latlng;
    setNewSpotPosition([lat, lng]);
    
    const name = prompt('포인트 이름을 입력하세요:');
    if (name) {
      try {
        await db.spots.add({
          name,
          lat,
          lng,
          createdAt: new Date(),
        });
        toast({
          title: '포인트가 저장되었습니다',
          description: name,
        });
        setIsAddingSpot(false);
        setNewSpotPosition(null);
      } catch (error) {
        console.error('Failed to save spot:', error);
        toast({
          title: '포인트 저장 실패',
          variant: 'destructive',
        });
      }
    }
  };

  const baseTileUrl = `https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/Base/{z}/{y}/{x}.png`;
  const baseTileAttribution = '© VWorld / 국토지리정보원';
  const satelliteTileUrl = `https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/Satellite/{z}/{y}/{x}.jpeg`;
  const osmKrTileUrl = 'https://tile.openstreetmap.kr/{z}/{x}/{y}.png';
  const osmKrAttribution = '© OpenStreetMap Korea';

  return (
    <div className="h-screen w-full pb-16">
      <div className="fixed top-4 left-4 right-4 z-[1000] flex gap-2 flex-wrap">
        <Button
          onClick={handleLocate}
          size="sm"
          className="bg-background shadow-lg"
        >
          <Locate className="w-4 h-4 mr-1" />
          내 위치
        </Button>
        
        <Button
          onClick={() => setIsAddingSpot(!isAddingSpot)}
          size="sm"
          variant={isAddingSpot ? 'default' : 'outline'}
          className="bg-background shadow-lg"
        >
          <MapPin className="w-4 h-4 mr-1" />
          {isAddingSpot ? '취소' : '포인트 추가'}
        </Button>
        
        <Button
          onClick={() => setShowSpotList(!showSpotList)}
          size="sm"
          variant="outline"
          className="bg-background shadow-lg"
        >
          <List className="w-4 h-4 mr-1" />
          포인트 목록 ({spots.length})
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
                <Button
                  key={spot.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setCenter([spot.lat, spot.lng]);
                    setShowSpotList(false);
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">{spot.name || '이름 없음'}</div>
                    <div className="text-xs text-muted-foreground">
                      {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}


      <div className="h-full w-full">
        <MapContainer
          center={center}
          zoom={6}
          className="h-full w-full"
          maxBounds={[[33.0, 124.0], [38.8, 132.1]]}
          maxBoundsViscosity={0.8}
        >
          <MapController center={center} />
          <MapClickHandler isAddingSpot={isAddingSpot} onMapClick={handleMapClick} />
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="기본지도">
              <TileLayer
                attribution={baseTileAttribution}
                url={baseTileUrl}
                maxZoom={19}
                errorTileUrl={osmKrTileUrl}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="위성지도">
              <TileLayer
                attribution="© VWorld / 국토지리정보원"
                url={satelliteTileUrl}
                maxZoom={19}
                errorTileUrl={osmKrTileUrl}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="OSM 한국">
              <TileLayer
                attribution={osmKrAttribution}
                url={osmKrTileUrl}
                maxZoom={19}
              />
            </LayersControl.BaseLayer>

            {enableKHOA ? (
              <LayersControl.Overlay name="해양 정보">
                <WMSTileLayer
                  url="https://www.khoa.go.kr/oceangrid/wms/map/map_wms.jsp"
                  params={{
                    layers: 'KHOA:coastline',
                    format: 'image/png',
                    transparent: true,
                  }}
                  attribution="© KHOA"
                />
              </LayersControl.Overlay>
            ) : null}
          </LayersControl>

          {position && (
            <Marker position={[position.lat, position.lng]}>
              <Popup>현재 위치</Popup>
            </Marker>
          )}

          {trips.map((trip) => 
            trip.lat && trip.lng ? (
              <Marker key={trip.id} position={[trip.lat, trip.lng]}>
                <Popup>
                  <div>
                    <p className="font-semibold">{trip.spotName || '출조 지점'}</p>
                    <p className="text-sm">{new Date(trip.dateStart).toLocaleDateString('ko-KR')}</p>
                  </div>
                </Popup>
              </Marker>
            ) : null
          )}

          {spots.map((spot) => (
            <Marker key={spot.id} position={[spot.lat, spot.lng]}>
              <Popup>
                <div>
                  <p className="font-semibold">{spot.name || '이름 없음'}</p>
                  <p className="text-xs text-muted-foreground">
                    {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                  </p>
                  {spot.waterType && <p className="text-sm">수역: {spot.waterType}</p>}
                  {spot.notes && <p className="text-sm">{spot.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(spot.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
