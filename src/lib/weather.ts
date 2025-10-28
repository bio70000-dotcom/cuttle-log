export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDir: number;
  pop: number;
  updatedAt: string;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m&hourly=precipitation_probability&timezone=auto`;
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Get current hour precipitation probability
    const currentHour = new Date().getHours();
    const pop = data.hourly?.precipitation_probability?.[currentHour] ?? 0;

    return {
      temperature: data.current.temperature_2m ?? 0,
      windSpeed: data.current.wind_speed_10m ?? 0,
      windDir: data.current.wind_direction_10m ?? 0,
      pop,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Failed to fetch weather:', error);
    throw error;
  }
}
