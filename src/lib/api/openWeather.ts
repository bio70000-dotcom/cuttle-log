// OpenWeather API as fallback
// Get API key from https://openweathermap.org/api

export interface OpenWeatherData {
  temp?: number;
  windDir?: number; // degrees
  windSpeed?: number;
  clouds?: number;
  lastFetched: Date;
}

export async function fetchOpenWeather(lat: number, lng: number, apiKey?: string): Promise<OpenWeatherData> {
  console.log('fetchOpenWeather stub called', { lat, lng, apiKey });
  
  if (!apiKey) {
    throw new Error('OpenWeather API 키가 설정되지 않았습니다');
  }

  try {
    // TODO: Uncomment when ready to use real API
    // const response = await fetch(
    //   `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    // );
    // const data = await response.json();
    // 
    // return {
    //   temp: data.main.temp,
    //   windDir: data.wind.deg,
    //   windSpeed: data.wind.speed,
    //   clouds: data.clouds.all,
    //   lastFetched: new Date(),
    // };

    // Stub data for now
    return {
      temp: 18.5,
      windDir: 270,
      windSpeed: 3.2,
      clouds: 20,
      lastFetched: new Date(),
    };
  } catch (error) {
    console.error('Failed to fetch OpenWeather data:', error);
    throw error;
  }
}

export function degToCompass(deg: number): string {
  const dirs = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}
