import { create } from 'zustand';
import { loadMarineBundle, MarineBundle } from '@/lib/marineBundle';

type MarineBundleState = {
  data?: MarineBundle;
  isLoading: boolean;
  error?: string;
  refresh: (lat: number, lng: number) => Promise<void>;
};

export const useMarineBundleStore = create<MarineBundleState>((set) => ({
  isLoading: false,
  refresh: async (lat, lng) => {
    set({ isLoading: true, error: undefined });
    try {
      const bundle = await loadMarineBundle(lat, lng);
      set({ data: bundle, isLoading: false, error: undefined });
    } catch (e: any) {
      set({ error: e.message || '해양 정보를 불러올 수 없습니다', isLoading: false });
    }
  },
}));
