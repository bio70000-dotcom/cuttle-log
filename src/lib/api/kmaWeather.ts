// TODO: Implement KMA (Korea Meteorological Administration) API
// Requires API key from https://data.kma.go.kr/

export interface WeatherData {
  temp?: number;
  windDir?: string;
  windSpeed?: number;
  clouds?: number;
  lastFetched: Date;
}

export async function fetchKMAWeather(lat: number, lng: number, apiKey?: string): Promise<WeatherData> {
  // Stub implementation
  console.log('fetchKMAWeather stub called', { lat, lng, apiKey });
  
  if (!apiKey) {
    throw new Error('KMA API 키가 설정되지 않았습니다');
  }

  // TODO: Replace with actual KMA API call
  // const response = await fetch(`KMA_ENDPOINT?lat=${lat}&lng=${lng}&key=${apiKey}`);
  // const data = await response.json();
  
  return {
    temp: 18.5,
    windDir: '서',
    windSpeed: 3.2,
    clouds: 20,
    lastFetched: new Date(),
  };
}
