// KHOA (Korea Hydrographic and Oceanographic Agency) tide API wrapper
// Delegates to the real implementation in tideExtreme.ts

import { findNearestStation, fetchTideExtremes, pickPrimary } from '@/lib/tideExtreme'
import { getKhoaApiKey } from '@/lib/config'

export interface TideData {
  stage: number // 1-12
  highTimes: string[] // ISO UTC strings
  lowTimes: string[] // ISO UTC strings
  lastFetched: Date
}

/**
 * Fetch tide data for the nearest KHOA station to (lat, lng) on the given date.
 *
 * API key resolution order (handled by getKhoaApiKey):
 *   1. localStorage 'api_key_khoa' (saved by SettingsPage)
 *   2. VITE_KHOA_KEY env var
 *
 * The apiKey parameter is accepted for backwards compatibility but is
 * ignored in favour of the unified resolver.
 */
export async function fetchKHOATide(
  lat: number,
  lng: number,
  date: Date,
  _apiKey?: string
): Promise<TideData> {
  const key = getKhoaApiKey()
  if (!key) {
    throw new Error('KHOA API 키가 설정되지 않았습니다')
  }

  const station = findNearestStation(lat, lng)
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '')

  const { highs, lows } = await fetchTideExtremes(station.code, yyyymmdd)
  const { high, low } = pickPrimary(highs, lows)

  // Derive a rough 1-12 stage from the number of high/low events on the day.
  // A full spring day has 2 highs & 2 lows; neap may have 1 of each.
  // The real stage (물때) is computed in marineBundle / stageResolver;
  // here we return a simple proxy: (highs count × 3) clamped to [1,12].
  const stage = Math.max(1, Math.min(12, highs.length * 3))

  return {
    stage,
    highTimes: high ? [high.time] : highs.map((h) => h.time),
    lowTimes: low ? [low.time] : lows.map((l) => l.time),
    lastFetched: new Date(),
  }
}
