import { create } from 'zustand';
import { fetchWeather, WeatherData } from '@/lib/weather';

interface WeatherState extends Partial<WeatherData> {
  isLoading: boolean;
  error?: string;
  refresh: (lat: number, lng: number) => Promise<void>;
  clear: () => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  temperature: undefined,
  windSpeed: undefined,
  windDir: undefined,
  pop: undefined,
  updatedAt: undefined,
  isLoading: false,
  error: undefined,
  
  refresh: async (lat: number, lng: number) => {
    set({ isLoading: true, error: undefined });
    
    try {
      const data = await fetchWeather(lat, lng);
      set({
        ...data,
        isLoading: false,
        error: undefined,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: '기상 정보를 불러올 수 없습니다.',
      });
    }
  },
  
  clear: () => {
    set({
      temperature: undefined,
      windSpeed: undefined,
      windDir: undefined,
      pop: undefined,
      updatedAt: undefined,
      isLoading: false,
      error: undefined,
    });
  },
}));
