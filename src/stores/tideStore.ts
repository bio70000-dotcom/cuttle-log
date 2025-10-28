import { create } from "zustand";
import { findNearestStation, fetchTideExtremes, pickPrimary } from "@/lib/tideExtreme";

type TideExtreme = {
  time: string;
  level: number;
};

type TideState = {
  stationName?: string;
  high?: TideExtreme;
  low?: TideExtreme;
  rangeToday?: number;
  isLoading: boolean;
  error?: string;
  updatedAt?: string;
  refresh: (lat: number, lng: number) => Promise<void>;
};

export const useTideStore = create<TideState>((set) => ({
  isLoading: false,
  refresh: async (lat, lng) => {
    set({ isLoading: true, error: undefined });
    try {
      const s = findNearestStation(lat, lng);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const { highs, lows } = await fetchTideExtremes(s.code, dateStr);
      
      if (highs.length === 0 && lows.length === 0) {
        set({ error: "오늘 극치 데이터 없음", isLoading: false });
        return;
      }
      
      const { high, low, rangeToday } = pickPrimary(highs, lows);
      
      set({
        stationName: s.name,
        high,
        low,
        rangeToday,
        updatedAt: new Date().toISOString(),
        isLoading: false,
        error: undefined,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },
}));
