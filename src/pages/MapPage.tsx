import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useGeolocation } from '@/hooks/useGeolocation';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
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

export default function MapPage() {
  const { position } = useGeolocation();
  const [center, setCenter] = useState<[number, number]>([37.5665, 126.9780]); // Seoul default

  const trips = useLiveQuery(() => 
    db.trips.filter(t => t.lat && t.lng).toArray(),
    []
  ) || [];

  useEffect(() => {
    if (position) {
      setCenter([position.lat, position.lng]);
    }
  }, [position]);

  return (
    <div className="h-screen w-full pb-16">
      <div className="h-full w-full">
        <MapContainer
          center={center}
          zoom={13}
          className="h-full w-full"
        >
          <MapController center={center} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {position && (
            <Marker position={[position.lat, position.lng]}>
              <Popup>현재 위치</Popup>
            </Marker>
          )}

          {trips.map((trip) => (
            trip.lat && trip.lng && (
              <Marker key={trip.id} position={[trip.lat, trip.lng]}>
                <Popup>
                  <div>
                    <p className="font-semibold">{trip.spotName || '출조 지점'}</p>
                    <p className="text-sm">{new Date(trip.dateStart).toLocaleDateString('ko-KR')}</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
