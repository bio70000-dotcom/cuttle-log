// cspell: words KHOA khoa oceangrid JEJU ULLEUNG DOKDO

import stations from '@/data/khoaStations.json'
import { getKhoaApiKey } from '@/lib/config'
import { toKST, formatKST } from '@/lib/time'
import { khoaUrl, fetchJson } from '@/lib/khoa'
import { classifyRegion, KRegion } from '@/utils/region'

/* ----------------------------------------------------
 * 시간/거리 유틸
 * ---------------------------------------------------- */

// 'YYYY-MM-DD HH:mm:ss' -> ISO(KST) 'YYYY-MM-DDTHH:mm:ss+09:00' -> toISOString()
function toKstISO(localTime: string): string | undefined {
  if (!localTime) return undefined
  const s = localTime.replace(' ', 'T') + '+09:00'
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined
}

// Haversine 거리(km)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // km
  const toRad = (d: number) => (d * Math.PI) / 180
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/* ----------------------------------------------------
 * 관측소 선택 로직 (권역 우선 + 임계거리)
 * ---------------------------------------------------- */

export type Station = {
  code: string
  name: string
  lat: number
  lng: number
  region?: KRegion
}

// 앱 시작 시 1회 라벨링
const stationsWithRegion: Station[] = (stations as Station[]).map((s) => ({
  ...s,
  region: classifyRegion({ lat: s.lat, lon: s.lng }),
}))

/**
 * 현재 좌표(lat, lng)에 대해:
 *  1) 좌표의 권역(서/남/동/제주)을 먼저 판정
 *  2) 동일 권역의 관측소 후보에서 최근접 선택
 *  3) 동일 권역이 비어 있으면 전체에서 선택(경고 로그)
 *  4) 임계거리(120km) 초과 시 경고 로그
 */
export function findNearestStation(lat: number, lng: number): Station {
  const hereRegion = classifyRegion({ lat, lon: lng })

  // 동일 권역 후보
  let candidates = stationsWithRegion.filter((s) => s.region === hereRegion)

  // 권역 내 관측소가 없으면 전체에서 선택
  if (candidates.length === 0) {
    console.warn(
      `⚠️ 권역(${hereRegion}) 내 관측소 없음. 전체 목록에서 선택합니다.`
    )
    candidates = stationsWithRegion
  }

  // 최근접
  let nearest = candidates[0]
  let min = Number.POSITIVE_INFINITY
  for (const s of candidates) {
    const d = haversine(lat, lng, s.lat, s.lng)
    if (d < min) {
      min = d
      nearest = s
    }
  }

  // 임계거리 체크(권역 내에서도 너무 멀면 데이터 보강 필요 안내)
  const THRESHOLD_KM = 120
  if (min > THRESHOLD_KM) {
    console.warn(
      `⚠️ 최근접 관측소까지 거리 ${min.toFixed(
        0
      )}km > ${THRESHOLD_KM}km. 관측소 데이터 보강 권장. (picked: ${
        nearest.name
      })`
    )
  }

  return nearest
}

/* ----------------------------------------------------
 * 조석 극치 (만조/간조) 조회
 * ---------------------------------------------------- */

// KHOA API row 타입
type KhoaExtremeRow = {
  hl_code?: string // '고' | '저' 또는 'H' | 'L'
  tph_time?: string // 'YYYY-MM-DD HH:mm:ss' (KST)
  tph_level?: string | number // 수위(cm)
}

// 타입 가드
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
function hasResultData(
  v: unknown
): v is { result: { data: KhoaExtremeRow[] } } {
  if (!isObject(v)) return false
  const r = (v as { result?: unknown }).result
  if (!isObject(r)) return false
  const data = (r as { data?: unknown }).data
  return Array.isArray(data)
}
function hasDataArray(v: unknown): v is { data: KhoaExtremeRow[] } {
  if (!isObject(v)) return false
  const data = (v as { data?: unknown }).data
  return Array.isArray(data)
}

export type TideExtreme = {
  time: string // ISO (UTC)
  level: number // cm
}

export async function fetchTideExtremes(
  stationCode: string,
  yyyymmdd: string
): Promise<{ highs: TideExtreme[]; lows: TideExtreme[] }> {
  const key = getKhoaApiKey()
  if (!key) throw new Error('KHOA API 키가 설정되지 않았습니다')

  const url = khoaUrl('/api/oceangrid/tideObsPreTab/search.do', {
    ServiceKey: key,
    ObsCode: stationCode,
    Date: yyyymmdd,
  })

  try {
    const json: unknown = await fetchJson(url)
    console.log('📦 KHOA API 응답:', json)

    let rows: KhoaExtremeRow[] = []
    if (hasResultData(json)) rows = json.result.data
    else if (hasDataArray(json)) rows = json.data

    console.log(`📊 극치 데이터 레코드 수: ${rows.length}`)

    // yyyymmdd → 'YYYY-MM-DD'
    const today =
      yyyymmdd.slice(0, 4) +
      '-' +
      yyyymmdd.slice(4, 6) +
      '-' +
      yyyymmdd.slice(6, 8)

    const norm: Array<{ type: 'HIGH' | 'LOW'; time: string; level: number }> =
      []

    for (const r of rows) {
      const raw = (r.hl_code ?? '').toString()
      const tLocal = String(r.tph_time ?? '')
      const tISO = toKstISO(tLocal)
      const v = Number(r.tph_level)

      // KST 날짜 필터 + 수치 유효성
      if (!tISO || !tLocal.startsWith(today) || !Number.isFinite(v)) continue

      // 코드 판정 (한글/영문 모두 대응)
      const up = raw.toUpperCase()
      const isHigh = raw.includes('고') || up === 'H'
      const isLow = raw.includes('저') || up === 'L'
      if (!isHigh && !isLow) continue

      norm.push({
        type: isHigh ? 'HIGH' : 'LOW',
        time: new Date(tISO).toISOString(), // ISO(UTC)
        level: v,
      })
    }

    const highs = norm
      .filter((n) => n.type === 'HIGH')
      .sort((a, b) => a.time.localeCompare(b.time))
    const lows = norm
      .filter((n) => n.type === 'LOW')
      .sort((a, b) => a.time.localeCompare(b.time))

    console.log(
      `✅ 파싱 완료 - 만조: ${highs.length}개, 간조: ${lows.length}개`
    )
    return { highs, lows }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('❌ 조석 극치 fetch 에러:', e)
    throw new Error(msg || '조석 극치 정보를 불러올 수 없습니다')
  }
}

/* ----------------------------------------------------
 * 대표(다음) 만조/간조 + 당일 조차
 * ---------------------------------------------------- */

export function pickPrimary(highs: TideExtreme[], lows: TideExtreme[]) {
  const nowIso = new Date().toISOString()
  const nextHigh = highs.find((h) => h.time >= nowIso) ?? highs[0]
  const nextLow = lows.find((l) => l.time >= nowIso) ?? lows[0]

  const rangeToday =
    highs.length && lows.length
      ? Math.max(...highs.map((h) => h.level)) -
        Math.min(...lows.map((l) => l.level))
      : undefined

  return { high: nextHigh, low: nextLow, rangeToday }
}

/* ----------------------------------------------------
 * 일자별(한국시간) 조차 그룹핑 (그래프 등 활용)
 * ---------------------------------------------------- */

export type Extreme = { time: string; type: 'HIGH' | 'LOW'; level: number }

export function groupDailyRangeKST(extremes: Extreme[]) {
  // 1) UTC→KST 변환
  const kst = extremes.map((x) => ({ ...x, kst: toKST(x.time) }))

  // 2) KST 날짜별로 묶기
  const byDay = new Map<string, Extreme[]>()
  for (const e of kst) {
    const day = formatKST(e.kst)
    const arr = byDay.get(day) ?? []
    arr.push(e)
    byDay.set(day, arr)
  }

  // 3) 각 날짜별 조차(max HIGH - min LOW)
  const out: Array<{ day: string; range: number | null }> = []
  for (const [day, arr] of byDay.entries()) {
    const highs = arr.filter((x) => x.type === 'HIGH').map((x) => x.level)
    const lows = arr.filter((x) => x.type === 'LOW').map((x) => x.level)
    const range =
      highs.length && lows.length
        ? Math.max(...highs) - Math.min(...lows)
        : null
    out.push({ day, range })
  }

  // 날짜 오름차순
  out.sort((a, b) => a.day.localeCompare(b.day))
  return out
}

/* ----------------------------------------------------
 * (옵션) N일치 극치 묶어 가져오기
 * ---------------------------------------------------- */

export async function fetchTideExtremesNextNDays(
  stationCode: string,
  startDate: Date,
  days: number
): Promise<Extreme[]> {
  const all: Extreme[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '')

    try {
      const { highs, lows } = await fetchTideExtremes(stationCode, yyyymmdd)
      all.push(
        ...highs.map((h) => ({
          time: h.time,
          type: 'HIGH' as const,
          level: h.level,
        }))
      )
      all.push(
        ...lows.map((l) => ({
          time: l.time,
          type: 'LOW' as const,
          level: l.level,
        }))
      )
    } catch (err) {
      console.warn(`⚠️ ${yyyymmdd} 조석 데이터 fetch 실패:`, err)
    }
  }
  return all
}

/* ----------------------------------------------------
 * 호환용 별칭 (marineBundle.ts에서 사용)
 * ---------------------------------------------------- */
export async function fetchTideExtremesMultiDay(
  stationCode: string,
  startDate: Date,
  days: number
): Promise<Extreme[]> {
  return fetchTideExtremesNextNDays(stationCode, startDate, days)
}
