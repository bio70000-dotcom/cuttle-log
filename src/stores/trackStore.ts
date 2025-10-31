import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TrackPoint = { lat: number; lng: number; t: number } // epoch ms

type TrackState = {
  isTracking: boolean
  autoCenter: boolean
  points: TrackPoint[]
  start: () => void
  stop: () => void
  clear: () => void
  addPoint: (p: TrackPoint) => void
  setAutoCenter: (v: boolean) => void
}

export const useTrackStore = create<TrackState>()(
  persist(
    (set, get) => ({
      isTracking: false,
      autoCenter: true,
      points: [],
      start: () => set({ isTracking: true }),
      stop: () => set({ isTracking: false }),
      clear: () => set({ points: [] }),
      addPoint: (p) => {
        const pts = get().points
        // 중복 좌표 방지(같은 지점 바로 연속 기록될 때)
        const last = pts[pts.length - 1]
        if (last && last.lat === p.lat && last.lng === p.lng) return
        set({ points: [...pts, p] })
      },
      setAutoCenter: (v) => set({ autoCenter: v }),
    }),
    { name: 'track-store-v1' }
  )
)
