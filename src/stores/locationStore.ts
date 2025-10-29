import { create } from 'zustand';

interface LocationState {
  lat?: number;
  lng?: number;
  placeName?: string;
  lastUpdated?: string;
  setCoords: (lat: number, lng: number) => void;
  setPlaceName: (name: string) => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: undefined,
  lng: undefined,
  placeName: undefined,
  lastUpdated: undefined,
  setCoords: (lat: number, lng: number) => {
    if (typeof window !== 'undefined') {
      (window as any).__lat = lat;
      (window as any).__lng = lng;
    }
    set({ lat, lng, lastUpdated: new Date().toISOString() });
  },
  setPlaceName: (name: string) => 
    set({ placeName: name }),
  clear: () => 
    set({ lat: undefined, lng: undefined, placeName: undefined, lastUpdated: undefined }),
}));
