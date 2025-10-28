import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RegionKey } from '@/config/regions';

type Mode = 'AUTO'|'MANUAL';
type State = {
  regionMode: Mode;
  regionManual?: RegionKey;
  setAuto: ()=>void;
  setManual: (r:RegionKey)=>void;
};

export const useSettingsStore = create<State>()(
  persist(
    (set) => ({
      regionMode:'AUTO',
      setAuto: ()=> set({regionMode:'AUTO', regionManual: undefined}),
      setManual: (r)=> set({regionMode:'MANUAL', regionManual:r})
    }),
    {
      name: 'settings-storage',
    }
  )
);
