// src/components/TodayBar.tsx
// 위치 표기 단순화(시·군·구/동 우선), 우편번호/국가/도로명 제거
// - MapPage가 스토어에 넣은 좌표를 우선 사용 → 없으면 useGeolocation 폴백
// - 역지오코딩 호출은 의미 있는 이동(≈50m) 때만
// - ESLint(no-explicit-any) 제거, cSpell 경고 단어 사용 회피

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, PlayCircle, Square, RefreshCw } from 'lucide-react'
import { Trip } from '@/db/schema'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useLocationStore } from '@/stores/locationStore'
import { useGeolocation } from '@/hooks/useGeolocation'
import { reverseGeocode } from '@/lib/geocoding'
import { toast } from 'sonner'

interface TodayBarProps {
  currentTrip: Trip | null
  onStartTrip: () => void
  onEndTrip: () => void
  onSelectSpot: () => void
}

// ──────────────────────────────────────────────────────────────────────────────
// 타입 유틸

type MaybeNum = number | undefined
type Permission = 'granted' | 'prompt' | 'denied' | undefined

type ReverseGeocodeResult =
  | string
  | {
      fullName?: string
      name?: string
    }

type RecordU = Record<string, unknown>

function isObject(v: unknown): v is RecordU {
  return typeof v === 'object' && v !== null
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function getProp(obj: unknown, key: string): unknown {
  if (!isObject(obj)) return undefined
  return obj[key]
}

// 다양한 구조에서 lat/lng 추출: {lat,lng} / {latitude,longitude} / {coords:{...}}
function pickLatLng(src: unknown): { lat: MaybeNum; lng: MaybeNum } {
  if (!isObject(src)) return { lat: undefined, lng: undefined }

  const maybeCoords = getProp(src, 'coords')
  const base = isObject(maybeCoords)
    ? (maybeCoords as RecordU)
    : (src as RecordU)

  const lat =
    (isNumber(base['lat']) ? (base['lat'] as number) : undefined) ??
    (isNumber(base['latitude']) ? (base['latitude'] as number) : undefined)

  const lng =
    (isNumber(base['lng']) ? (base['lng'] as number) : undefined) ??
    (isNumber(base['longitude']) ? (base['longitude'] as number) : undefined)

  return { lat, lng }
}

// 좌표가 의미 있게 변했는지(약 50m) 체크
function movedEnough(a?: number, b?: number) {
  if (a == null || b == null) return true
  return Math.abs(a - b) >= 0.0005
}

/** 주소 간소화
 * 입력 예: "아바이마을 1길, 청호동, 속초시, 강원특별자치도, 24882, 대한민국"
 * 출력 예: "속초시 청호동"
 * 규칙:
 *  - 제거: '대한민국', 5자리 우편번호, 도로명(…길/…로/…대로/…가/…번길)
 *  - 분류: 도/특별자치도, 시/군/구, 동/읍/면
 *  - 우선: (시군구 + 동읍면) > (도 + 시군구) > (도) > (시군구) > (동읍면)
 */
function simplifyAddress(fullName?: string) {
  if (!fullName) return '-'

  const rawParts = fullName
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const parts = rawParts.filter((p) => {
    if (p === '대한민국') return false
    if (/^\d{5}$/.test(p)) return false // 우편번호
    if (/(길|로|대로|번길|가)$/.test(p)) return false // 도로명
    return true
  })

  const isProvince = (p: string) =>
    /(특별자치도|광역시|특별시|자치시|도)$/.test(p)
  const isCityCountyDistrict = (p: string) => /(시|군|구)$/.test(p)
  const isNeighborhood = (p: string) => /(동|읍|면)$/.test(p)

  const province = parts.find(isProvince)
  const city = parts.find(isCityCountyDistrict)
  const neighborhood = parts.find(isNeighborhood)

  if (city && neighborhood) return `${city} ${neighborhood}`
  if (province && city) return `${province} ${city}`
  if (province) return province
  if (city) return city
  if (neighborhood) return neighborhood

  // 그래도 못 찾으면 뒤쪽 항목 2개 정도를 합쳐서 반환
  const fallback = parts.slice(-2).join(' ')
  return fallback || '-'
}

// ──────────────────────────────────────────────────────────────────────────────

export function TodayBar({
  currentTrip,
  onStartTrip,
  onEndTrip,
  onSelectSpot,
}: TodayBarProps) {
  const isOnline = useOnlineStatus()

  // 1) LocationStore에서 여러 경로를 탐색 (MapPage가 넣어준 값 우선)
  const storeState = useLocationStore((s) => s)
  const storeLatLngCandidates = [
    pickLatLng(getProp(storeState, 'coords')),
    pickLatLng(getProp(storeState, 'current')),
    pickLatLng(getProp(storeState, 'selected')),
    pickLatLng(getProp(storeState, 'position')),
    pickLatLng(getProp(storeState, 'currentSpot')),
    pickLatLng(storeState), // 루트에 바로 lat/lng가 있을 가능성
  ]

  const chosenFromStore = storeLatLngCandidates.find(
    (c) => isNumber(c.lat) && isNumber(c.lng)
  )

  const storeLat = chosenFromStore?.lat
  const storeLng = chosenFromStore?.lng

  const storePermission: Permission =
    (getProp(storeState, 'permission') as Permission) ??
    (getProp(storeState, 'geoPermission') as Permission) ??
    (getProp(storeState, 'status') as Permission)

  // 2) geolocation 훅 (스토어에 없을 때 폴백)
  const geo = useGeolocation() as {
    coords?: {
      lat?: number
      lng?: number
      latitude?: number
      longitude?: number
    } | null
    permission?: Permission
  }

  const geoPicked = pickLatLng(geo?.coords)
  const geoLat = geoPicked.lat
  const geoLng = geoPicked.lng

  // 3) 최종 좌표/권한: store 우선 → geolocation 폴백
  const lat = storeLat ?? geoLat
  const lng = storeLng ?? geoLng
  const permission: Permission = storePermission ?? geo?.permission

  const [placeFull, setPlaceFull] = useState('')
  const [isLoadingAddr, setIsLoadingAddr] = useState(false)
  const [syncStatus] = useState<
    '오프라인 저장 중' | '동기화 대기' | '동기화 완료'
  >('동기화 완료')

  const lastGeoLat = useRef<number | undefined>(undefined)
  const lastGeoLng = useRef<number | undefined>(undefined)

  const shortLabel = useMemo(() => simplifyAddress(placeFull), [placeFull])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (lat == null || lng == null) return

      const needGeocode =
        movedEnough(lat, lastGeoLat.current) ||
        movedEnough(lng, lastGeoLng.current)
      if (!needGeocode) return

      try {
        setIsLoadingAddr(true)
        const result = (await reverseGeocode(lat, lng)) as ReverseGeocodeResult
        if (cancelled) return

        const addr =
          typeof result === 'string'
            ? result
            : (result?.fullName || result?.name || '').toString()

        if (addr && addr !== placeFull) {
          setPlaceFull(addr)
          lastGeoLat.current = lat
          lastGeoLng.current = lng
        }
      } catch {
        if (!cancelled) {
          if (!sessionStorage.getItem('rg_err_notified')) {
            sessionStorage.setItem('rg_err_notified', '1')
            toast.error('위치 정보를 불러오지 못했어요. 다시 시도해 주세요.')
          }
        }
      } finally {
        if (!cancelled) setIsLoadingAddr(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return (
    <div className="w-full rounded-lg border bg-card p-3 md:p-4 flex items-center gap-3 min-h-[56px]">
      {/* 위치 버튼: 시/군/구 + 동/읍/면 우선, 우편번호/국가/도로명 제거 */}
      <Button
        variant="outline"
        size="sm"
        className="inline-flex items-center gap-2 flex-1 justify-start text-left"
        onClick={onSelectSpot}
        title={placeFull || '위치를 선택하세요'}
      >
        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
        <span className="truncate">
          위치:{' '}
          {isLoadingAddr
            ? '불러오는 중…'
            : shortLabel ||
              (permission === 'denied'
                ? '권한 필요'
                : lat == null || lng == null
                ? '위치 정보 없음'
                : '-')}
        </span>
      </Button>

      {/* 네트워크/동기화 상태 */}
      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={isOnline ? 'secondary' : 'destructive'}>
          {isOnline ? '온라인' : '오프라인'}
        </Badge>
        <div className="inline-flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>{syncStatus}</span>
        </div>
      </div>

      {/* 출조 시작/종료 버튼 */}
      {currentTrip ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={onEndTrip}
          className="flex-shrink-0"
        >
          <Square className="w-4 h-4 mr-2" /> 종료
        </Button>
      ) : (
        <Button size="sm" onClick={onStartTrip} className="flex-shrink-0">
          <PlayCircle className="w-4 h-4 mr-2" /> 출조 시작
        </Button>
      )}
    </div>
  )
}
