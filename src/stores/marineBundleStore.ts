import { create } from 'zustand';
import { loadMarineBundle, MarineBundle } from '@/lib/marineBundle';
import { useLocationStore } from '@/stores/locationStore';

type MarineBundleState = {
  data?: MarineBundle;
  isLoading: boolean;
  error?: string;
  refresh: (lat?: number, lng?: number) => Promise<void>;
};

export const useMarineBundleStore = create<MarineBundleState>((set) => ({
  isLoading: false,
  refresh: async (lat?, lng?) => {
    set({ isLoading: true, error: undefined });
    try {
      const loc = useLocationStore.getState();
      const LAT = lat ?? loc.lat;
      const LNG = lng ?? loc.lng;
      
      if (LAT == null || LNG == null) {
        throw new Error('좌표 없음: 지도에서 위치를 먼저 설정하세요.');
      }
      
      const bundle = await loadMarineBundle(LAT, LNG);
      set({ data: bundle, isLoading: false, error: undefined });
    } catch (e: any) {
      set({ error: e.message || '해양 정보를 불러올 수 없습니다', isLoading: false });
    }
  },
}));
