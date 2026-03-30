// Water temperature observation API (KHOA)
// Endpoint: /oceangrid/tideObsTemp/search.do
// Docs: https://www.khoa.go.kr/api/oceangrid/tideObsTemp/search.do

import { getKhoaApiKey } from '@/lib/config'
import { khoaUrl, fetchJson } from '@/lib/khoa'

export interface WaterTempData {
  /** KST time string from API, e.g. "2024-05-01 14:00:00" */
  recordTime: string
  /** ISO UTC timestamp */
  time: string
  /** Water temperature in °C */
  temp: number
}

// Type guards for KHOA response shapes
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

type RawTempRow = {
  record_time?: string
  water_temp?: string | number
}

function hasResultData(v: unknown): v is { result: { data: RawTempRow[] } } {
  if (!isObject(v)) return false
  const r = (v as { result?: unknown }).result
  if (!isObject(r)) return false
  return Array.isArray((r as { data?: unknown }).data)
}

function hasDataArray(v: unknown): v is { data: RawTempRow[] } {
  if (!isObject(v)) return false
  return Array.isArray((v as { data?: unknown }).data)
}

/** Convert KST local time string "YYYY-MM-DD HH:mm:ss" → ISO UTC string */
function kstLocalToISO(localTime: string): string | undefined {
  if (!localTime) return undefined
  const s = localTime.replace(' ', 'T') + '+09:00'
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined
}

/**
 * Fetch hourly water temperature observations from KHOA for a given
 * station and date.
 *
 * @param obsCode  KHOA observation station code (e.g. "DT_0001")
 * @param date     Date string in YYYYMMDD format (e.g. "20240501")
 * @returns        Array of hourly observations, empty array on error/no data
 */
export async function fetchWaterTemp(
  obsCode: string,
  date: string
): Promise<WaterTempData[]> {
  const key = getKhoaApiKey()
  if (!key) {
    return []
  }

  const url = khoaUrl('/oceangrid/tideObsTemp/search.do', {
    ServiceKey: key,
    ObsCode: obsCode,
    Date: date,
  })

  try {
    const json: unknown = await fetchJson(url)

    let rows: RawTempRow[] = []
    if (hasResultData(json)) rows = json.result.data
    else if (hasDataArray(json)) rows = json.data

    const results: WaterTempData[] = []

    for (const row of rows) {
      const recordTime = String(row.record_time ?? '')
      const temp = Number(row.water_temp)

      if (!recordTime || !Number.isFinite(temp)) continue

      const isoTime = kstLocalToISO(recordTime)
      if (!isoTime) continue

      results.push({ recordTime, time: isoTime, temp })
    }

    return results.sort((a, b) => a.time.localeCompare(b.time))
  } catch (err) {
    // API down or network error — return empty array so callers degrade gracefully
    return []
  }
}

/**
 * Pick the water temperature observation closest to the current time.
 * Returns undefined if the array is empty.
 */
export function pickCurrentWaterTemp(
  observations: WaterTempData[]
): WaterTempData | undefined {
  if (observations.length === 0) return undefined

  const nowMs = Date.now()
  return observations.reduce((best, cur) => {
    const bestDiff = Math.abs(new Date(best.time).getTime() - nowMs)
    const curDiff = Math.abs(new Date(cur.time).getTime() - nowMs)
    return curDiff < bestDiff ? cur : best
  })
}
