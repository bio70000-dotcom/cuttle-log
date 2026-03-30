// Pre-load trip data: tide extremes + weather forecast + water temperature
// Results are cached in Dexie (settings table) with key prefix "preload_"

import { db } from '@/db/schema'
import { findNearestStation, fetchTideExtremes } from '@/lib/tideExtreme'
import type { TideExtreme } from '@/lib/tideExtreme'
import { fetchWeather } from '@/lib/weather'
import type { WeatherData } from '@/lib/weather'
import { fetchWaterTemp } from '@/lib/waterTemp'
import type { WaterTempData } from '@/lib/waterTemp'

// ── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'preload_'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry<T> {
  data: T
  cachedAt: string // ISO UTC
}

async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const row = await db.settings.where('key').equals(CACHE_PREFIX + key).first()
    if (!row) return undefined
    const entry: CacheEntry<T> = JSON.parse(row.value)
    const age = Date.now() - new Date(entry.cachedAt).getTime()
    if (age > CACHE_TTL_MS) return undefined
    return entry.data
  } catch {
    return undefined
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() }
  const value = JSON.stringify(entry)

  const existing = await db.settings.where('key').equals(CACHE_PREFIX + key).first()
  if (existing?.id != null) {
    await db.settings.update(existing.id, { value })
  } else {
    await db.settings.add({ key: CACHE_PREFIX + key, value })
  }
}

// ── Public types ─────────────────────────────────────────────────────────────

export interface PreloadResult {
  stationCode: string
  stationName: string
  tides: {
    highs: TideExtreme[]
    lows: TideExtreme[]
  }
  weather: WeatherData | null
  waterTemp: WaterTempData[]
  fetchedAt: string // ISO UTC
  errors: string[]
}

// ── Main preload function ────────────────────────────────────────────────────

/**
 * Fetch tide extremes, weather forecast and water temperature for the
 * location/date, caching results in Dexie for 30 minutes.
 *
 * @param lat   Latitude (WGS84)
 * @param lng   Longitude (WGS84)
 * @param date  Target date
 */
export async function preloadTripData(
  lat: number,
  lng: number,
  date: Date
): Promise<PreloadResult> {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '')
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${yyyymmdd}`

  // Return cached result if still fresh
  const cached = await readCache<PreloadResult>(cacheKey)
  if (cached) return cached

  const station = findNearestStation(lat, lng)
  const errors: string[] = []

  // Fetch all three sources in parallel
  const [tidesResult, weatherResult, waterTempResult] = await Promise.allSettled([
    fetchTideExtremes(station.code, yyyymmdd),
    fetchWeather(lat, lng),
    fetchWaterTemp(station.code, yyyymmdd),
  ])

  // Process tides
  let tides: PreloadResult['tides'] = { highs: [], lows: [] }
  if (tidesResult.status === 'fulfilled') {
    tides = tidesResult.value
  } else {
    errors.push(`조석 데이터 오류: ${tidesResult.reason instanceof Error ? tidesResult.reason.message : String(tidesResult.reason)}`)
  }

  // Process weather
  let weather: WeatherData | null = null
  if (weatherResult.status === 'fulfilled') {
    weather = weatherResult.value
  } else {
    errors.push(`날씨 데이터 오류: ${weatherResult.reason instanceof Error ? weatherResult.reason.message : String(weatherResult.reason)}`)
  }

  // Process water temperature
  let waterTemp: WaterTempData[] = []
  if (waterTempResult.status === 'fulfilled') {
    waterTemp = waterTempResult.value
  } else {
    errors.push(`수온 데이터 오류: ${waterTempResult.reason instanceof Error ? waterTempResult.reason.message : String(waterTempResult.reason)}`)
  }

  const result: PreloadResult = {
    stationCode: station.code,
    stationName: station.name,
    tides,
    weather,
    waterTemp,
    fetchedAt: new Date().toISOString(),
    errors,
  }

  // Cache even partial results so a retry doesn't hammer the API
  try {
    await writeCache(cacheKey, result)
  } catch {
    // Cache write failure is non-fatal
  }

  return result
}
