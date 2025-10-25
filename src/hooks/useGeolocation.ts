import { useState, useEffect } from 'react';

export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGeolocation(options?: PositionOptions) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('위치 정보를 지원하지 않는 브라우저입니다');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000, // 5 minutes
        timeout: 10000,
        ...options,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error };
}
