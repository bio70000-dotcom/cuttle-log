import { create } from "zustand";
import { findNearestStation, fetchTidePred, extractHighLow } from "@/lib/tidePred";

type TideState = {
  stationName?: string;
  highs?: string[];
  lows?: string[];
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
      const data = await fetchTidePred(s.code, dateStr);
      const { highs, lows } = extractHighLow(data);
      set({
        stationName: s.name,
        highs,
        lows,
        updatedAt: new Date().toISOString(),
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },
}));
