import { useRef, useCallback } from 'react';
import { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import { db } from '@/db/schema';
import { toast } from 'sonner';

export function useTripTracking() {
  const trackingIntervalRef = useRef<number | null>(null);
  const conditionIntervalRef = useRef<number | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const startTracking = useCallback(async (map: LeafletMap, tripId: number) => {
    // Create polyline for route
    const polyline = L.polyline([], {
      color: '#1976d2',
      weight: 4,
      opacity: 0.8,
    }).addTo(map);
    polylineRef.current = polyline;

    // GPS tracking every 1 minute
    const trackPosition = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Save trackpoint
          await db.trackPoints.add({
            tripId,
            at: new Date(),
            lat: latitude,
            lng: longitude,
            accuracy,
          });

          // Add to polyline and center map
          const latLng = L.latLng(latitude, longitude);
          polyline.addLatLng(latLng);
          map.panTo(latLng);
        },
        (error) => {
          console.error('GPS tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    };

    // Track immediately
    trackPosition();
    
    // Then every 1 minute
    trackingIntervalRef.current = window.setInterval(trackPosition, 60000);

    toast.success('GPS 추적을 시작했습니다');
  }, []);

  const stopTracking = useCallback(() => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    if (conditionIntervalRef.current) {
      clearInterval(conditionIntervalRef.current);
      conditionIntervalRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    toast.info('GPS 추적을 중지했습니다');
  }, []);

  return { startTracking, stopTracking };
}
