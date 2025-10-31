// cspell: words JEJU ULLEUNG DOKDO

// src/utils/region.ts
export type KRegion = '서해' | '남해' | '동해' | '제주'
export type LatLon = { lat: number; lon: number }

const R = 6371e3 // meters
const toRad = (d: number) => (d * Math.PI) / 180

function haversine(a: LatLon, b: LatLon) {
  const φ1 = toRad(a.lat),
    φ2 = toRad(b.lat)
  const Δφ = toRad(b.lat - a.lat)
  const Δλ = toRad(b.lon - a.lon)
  const s =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s)) // meters
}

// --- 섬 우선 판정 (좌표/반경) ---
const JEJU_CENTER: LatLon = { lat: 33.3617, lon: 126.5292 }
const ULLEUNG_CENTER: LatLon = { lat: 37.5, lon: 130.87 }
const DOKDO_CENTER: LatLon = { lat: 37.2417, lon: 131.8644 }

const JEJU_RADIUS = 130_000 // m
const ULLEUNG_RADIUS = 80_000
const DOKDO_RADIUS = 40_000

// --- 본토 해안 대표 포인트 (필요시 보강 가능) ---
const WEST_COAST: LatLon[] = [
  { lat: 37.95, lon: 124.63 }, // 백령도
  { lat: 37.46, lon: 126.6 }, // 인천
  { lat: 36.36, lon: 126.53 }, // 보령
  { lat: 35.98, lon: 126.7 }, // 군산
  { lat: 34.81, lon: 126.39 }, // 목포
]

const SOUTH_COAST: LatLon[] = [
  { lat: 34.8, lon: 126.39 }, // 목포
  { lat: 34.72, lon: 127.74 }, // 여수
  { lat: 34.83, lon: 128.42 }, // 통영
  { lat: 35.1, lon: 129.04 }, // 부산
]

const EAST_COAST: LatLon[] = [
  { lat: 35.1, lon: 129.04 }, // 부산
  { lat: 36.03, lon: 129.38 }, // 포항
  { lat: 37.75, lon: 129.89 }, // 강릉
  { lat: 38.2, lon: 128.59 }, // 고성
]

function minDistanceTo(points: LatLon[], p: LatLon) {
  return points.reduce((min, q) => Math.min(min, haversine(p, q)), Infinity)
}

export function classifyRegion(p: LatLon): KRegion {
  // 1) 섬 우선
  if (haversine(p, JEJU_CENTER) <= JEJU_RADIUS) return '제주'
  if (haversine(p, ULLEUNG_CENTER) <= ULLEUNG_RADIUS) return '동해'
  if (haversine(p, DOKDO_CENTER) <= DOKDO_RADIUS) return '동해'

  // 2) 본토 해안: 가장 가까운 해역
  const dW = minDistanceTo(WEST_COAST, p)
  const dS = minDistanceTo(SOUTH_COAST, p)
  const dE = minDistanceTo(EAST_COAST, p)
  const min = Math.min(dW, dS, dE)
  if (min === dW) return '서해'
  if (min === dS) return '남해'
  return '동해'
}
