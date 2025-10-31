// src/pages/MapPage.tsx
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  ScaleControl,
  Polyline,
} from 'react-leaflet'
import * as L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Navigation,
  RefreshCw,
  Copy,
  Crosshair,
  Bug,
  Layers,
  Play,
  Square,
  Trash2,
  MapPin,
} from 'lucide-react'

import ClientOnly from '@/components/ClientOnly'
import { useLocationStore } from '@/stores/locationStore'
import { useWeatherStore } from '@/stores/weatherStore'
import { useTideStore } from '@/stores/tideStore'
import { useTrackStore, TrackPoint } from '@/stores/trackStore'

import { reverseGeocode } from '@/lib/geocoding'
import { resolveRegion, REGION_NAMES } from '@/config/regions'
import { findNearestStation } from '@/lib/tideExtreme'

/* ===================== 유틸/공통 ===================== */

const clampLat = (v: number) => Math.max(-85, Math.min(85, v))
const clampLng = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180

function isZeroZero(lat?: number | null, lng?: number | null) {
  return (lat === 0 && lng === 0) || lat == null || lng == null
}

// Haversine 거리(m)
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  return R * c
}

function useApplyLocation() {
  const setCoords = useLocationStore((s) => s.setCoords)
  const setPlaceName = useLocationStore((s) => s.setPlaceName)
  const refreshWeather = useWeatherStore((s) => s.refresh)
  const refreshTide = useTideStore((s) => s.refresh)

  return async (lat: number, lng: number) => {
    setCoords(lat, lng)

    reverseGeocode(lat, lng)
      .then((name) => name && setPlaceName(name))
      .catch((e) => console.warn('reverseGeocode failed:', e))

    await Promise.allSettled([refreshWeather(lat, lng), refreshTide(lat, lng)])
  }
}

/* ===================== 서브 컴포넌트 ===================== */

// Map 인스턴스 준비 콜백
function OnReady({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onReady(map)
    setTimeout(() => map.invalidateSize(), 0)
  }, [map, onReady])
  return null
}

function LocateControl({
  onLocated,
}: {
  onLocated: (lat: number, lng: number) => void
}) {
  const map = useMap()
  const [loading, setLoading] = useState(false)

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error('이 브라우저에서는 위치 정보를 지원하지 않습니다.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = clampLat(pos.coords.latitude)
        const lng = clampLng(pos.coords.longitude)
        onLocated(lat, lng)
        map.flyTo([lat, lng], 14)
        setLoading(false)
        toast.success('현재 위치로 이동했습니다.')
      },
      (err) => {
        console.warn(err)
        setLoading(false)
        toast.error('현재 위치를 가져오지 못했습니다.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <Button
      onClick={locate}
      className="absolute bottom-6 right-6 z-[1000] shadow-lg gap-2"
      size="lg"
      variant="default"
    >
      <Navigation className="w-4 h-4" />
      {loading ? '위치 찾는 중...' : '내 위치'}
    </Button>
  )
}

function InteractiveMarker({
  position,
  onChange,
}: {
  position: { lat: number; lng: number }
  onChange: (lat: number, lng: number) => void
}) {
  const markerRef = useRef<L.Marker | null>(null)

  useMapEvents({
    click(e) {
      onChange(clampLat(e.latlng.lat), clampLng(e.latlng.lng))
      toast.success('지도를 클릭해 위치를 변경했습니다.')
    },
  })

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(L.latLng(position.lat, position.lng))
    }
  }, [position])

  return (
    <Marker
      ref={(m) => {
        markerRef.current = m
      }}
      position={position as L.LatLngExpression}
      draggable
      eventHandlers={{
        dragend: () => {
          const pos = markerRef.current?.getLatLng()
          if (!pos) return
          onChange(clampLat(pos.lat), clampLng(pos.lng))
          toast.success('마커 드래그로 위치를 변경했습니다.')
        },
      }}
    >
      <Popup>이 지점으로 분석합니다.</Popup>
    </Marker>
  )
}

/* ===================== 메인 페이지 ===================== */

export default function MapPage() {
  // 전역 상태
  const latStore = useLocationStore((s) => s.lat)
  const lngStore = useLocationStore((s) => s.lng)
  const placeName = useLocationStore((s) => s.placeName)
  const stationName = useTideStore((s) => s.stationName)

  const applyLocation = useApplyLocation()
  const refreshWeather = useWeatherStore((s) => s.refresh)
  const refreshTide = useTideStore((s) => s.refresh)

  // 트랙 상태
  const isTracking = useTrackStore((s) => s.isTracking)
  const points = useTrackStore((s) => s.points)
  const startTrack = useTrackStore((s) => s.start)
  const stopTrack = useTrackStore((s) => s.stop)
  const clearTrack = useTrackStore((s) => s.clear)
  const addPoint = useTrackStore((s) => s.addPoint)
  const autoCenter = useTrackStore((s) => s.autoCenter)
  const setAutoCenter = useTrackStore((s) => s.setAutoCenter)

  // 로컬 좌표(표시/입력)
  const DEFAULT_LAT = 37.5665
  const DEFAULT_LNG = 126.978

  const [lat, setLat] = useState<number>(
    isZeroZero(latStore, lngStore) ? DEFAULT_LAT : (latStore as number)
  )
  const [lng, setLng] = useState<number>(
    isZeroZero(latStore, lngStore) ? DEFAULT_LNG : (lngStore as number)
  )
  const [latInput, setLatInput] = useState(String(lat))
  const [lngInput, setLngInput] = useState(String(lng))

  // 🔧 디버그 패널 상태 (누락 보완)
  const [showDebug, setShowDebug] = useState(false)

  // GPS 자동 보정 1회
  const [autoLocated, setAutoLocated] = useState(false)

  // 지도/리사이즈
  const mapRef = useRef<L.Map | null>(null)
  const invalidate = () => mapRef.current?.invalidateSize()
  useEffect(() => {
    const onResize = () => invalidate()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 최초 자동 위치
  useEffect(() => {
    const needAuto = isZeroZero(latStore, lngStore)
    if (!autoLocated && needAuto && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const la = clampLat(pos.coords.latitude)
          const ln = clampLng(pos.coords.longitude)
          setLat(la)
          setLng(ln)
          setLatInput(String(la))
          setLngInput(String(ln))
          void applyLocation(la, ln)
          if (mapRef.current) {
            mapRef.current.flyTo(
              [la, ln],
              Math.max(12, mapRef.current.getZoom())
            )
          }
          setAutoLocated(true)
        },
        (err) => {
          console.warn('Auto locate failed:', err)
          setAutoLocated(true)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      setAutoLocated(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latStore, lngStore, autoLocated])

  // 스토어 → 로컬 동기화
  useEffect(() => {
    if (
      typeof latStore === 'number' &&
      typeof lngStore === 'number' &&
      !isZeroZero(latStore, lngStore)
    ) {
      setLat(latStore)
      setLng(lngStore)
      setLatInput(String(latStore))
      setLngInput(String(lngStore))
    }
  }, [latStore, lngStore])

  // URL 해시 동기화
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const hLat = Number(hash.get('lat'))
    const hLng = Number(hash.get('lng'))
    if (Number.isFinite(hLat) && Number.isFinite(hLng)) {
      const nLat = clampLat(hLat)
      const nLng = clampLng(hLng)
      setLat(nLat)
      setLng(nLng)
      setLatInput(String(nLat))
      setLngInput(String(nLng))
      void applyLocation(nLat, nLng)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const p = new URLSearchParams()
    p.set('lat', String(lat))
    p.set('lng', String(lng))
    window.location.hash = p.toString()
  }, [lat, lng])

  // 권역/관측소 표시
  const regionKey = useMemo(() => resolveRegion(lat, lng), [lat, lng])
  const regionLabel = REGION_NAMES[regionKey]
  const nearestStationName = useMemo(
    () => findNearestStation(lat, lng)?.name ?? stationName ?? '—',
    [lat, lng, stationName]
  )

  // 입력 적용/지도 변화
  const onApplyInputs = async () => {
    const nLat = clampLat(Number(latInput))
    const nLng = clampLng(Number(lngInput))
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
      toast.error('좌표 형식이 올바르지 않습니다.')
      return
    }
    setLat(nLat)
    setLng(nLng)
    await applyLocation(nLat, nLng)
    if (mapRef.current)
      mapRef.current.flyTo([nLat, nLng], Math.max(12, mapRef.current.getZoom()))
  }

  const onChangeByMap = async (nLat: number, nLng: number) => {
    setLat(nLat)
    setLng(nLng)
    setLatInput(String(nLat))
    setLngInput(String(nLng))
    await applyLocation(nLat, nLng)
  }

  /* ===================== 출조 트래킹 ===================== */

  const watchIdRef = useRef<number | null>(null)
  const lastAcceptRef = useRef<TrackPoint | null>(null)

  const MIN_TIME_MS = 15_000 // 15초 이상
  const MIN_DIST_M = 25 // 25m 이상 이동 시만 기록

  const startTrip = () => {
    if (!navigator.geolocation) {
      toast.error('이 브라우저는 GPS를 지원하지 않습니다.')
      return
    }
    if (watchIdRef.current != null) return

    startTrack()

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const la = clampLat(pos.coords.latitude)
        const ln = clampLng(pos.coords.longitude)
        const now = Date.now()

        const last =
          lastAcceptRef.current ??
          (points.length ? points[points.length - 1] : null)
        const candidate: TrackPoint = { lat: la, lng: ln, t: now }

        const passTime = !last || now - last.t >= MIN_TIME_MS
        const passDist = !last || distanceMeters(last, candidate) >= MIN_DIST_M

        if (passTime && passDist) {
          addPoint(candidate)
          lastAcceptRef.current = candidate

          if (autoCenter && mapRef.current) {
            mapRef.current.panTo([la, ln])
          }
        }
      },
      (err) => {
        console.warn('watchPosition error:', err)
        toast.error('GPS 추적 중 오류가 발생했습니다.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      }
    )

    toast.success('출조 기록을 시작합니다.')
  }

  const stopTrip = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    stopTrack()
    toast.success('출조 기록을 종료했습니다.')
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  /* ===================== 렌더 ===================== */

  return (
    <div className="fixed inset-0" style={{ width: '100vw', height: '100vh' }}>
      {/* 우측 상단 패널 */}
      <div className="absolute right-3 top-3 z-[1000] w-[360px]">
        <Card className="p-3 space-y-3 shadow-xl pointer-events-auto">
          {/* 좌표 입력 */}
          <div className="text-sm font-semibold">좌표 입력 / 이동</div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="위도 (e.g. 37.5665)"
            />
            <Input
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="경도 (e.g. 126.9780)"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onApplyInputs} className="flex-1">
              좌표 적용
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${lat},${lng}`)
                  toast.success('좌표를 클립보드에 복사했습니다.')
                } catch {
                  toast.error('클립보드 복사에 실패했습니다.')
                }
              }}
              className="gap-1"
            >
              <Copy className="w-4 h-4" /> 복사
            </Button>
          </div>

          <Separator />

          {/* 상태 표시 */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">권역</span>
              <span className="font-medium">{regionLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">관측소</span>
              <span className="font-medium">{nearestStationName}</span>
            </div>
            {placeName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">지명</span>
                <span
                  className="font-medium truncate max-w-[200px]"
                  title={placeName}
                >
                  {placeName}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* 날씨/조석 & 베이스맵 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void refreshWeather(lat, lng)
                  .then(() => toast.success('날씨 데이터를 새로고침했습니다.'))
                  .catch(() => toast.error('날씨 새로고침 실패'))
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 날씨 새로고침
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void refreshTide(lat, lng)
                  .then(() => toast.success('조석 데이터를 새로고침했습니다.'))
                  .catch(() => toast.error('조석 새로고침 실패'))
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 조석 새로고침
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            {/* 현재는 OSM 고정. 필요 시 basemap 상태화 */}
            <select
              value={'OSM'}
              onChange={() =>
                toast.message('베이스맵은 OSM(기본) 사용 중입니다.')
              }
              className="border rounded px-2 py-1 text-sm w-full"
            >
              <option value="OSM">OSM (기본)</option>
            </select>
          </div>

          <Separator />

          {/* 출조 트래킹 */}
          <div className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" /> 출조 트래킹
          </div>
          <div className="flex gap-2">
            <Button
              onClick={startTrip}
              disabled={isTracking}
              className="flex-1 gap-2"
            >
              <Play className="w-4 h-4" /> 시작
            </Button>
            <Button
              onClick={stopTrip}
              disabled={!isTracking}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Square className="w-4 h-4" /> 종료
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              포인트 수: {points.length}
            </div>
            <label className="text-xs flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCenter}
                onChange={(e) => setAutoCenter(e.target.checked)}
                className="cursor-pointer"
              />
              자동센터
            </label>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              clearTrack()
              lastAcceptRef.current = null
              toast.success('트랙을 초기화했습니다.')
            }}
            className="w-full gap-2"
          >
            <Trash2 className="w-4 h-4" /> 트랙 초기화
          </Button>

          <Separator />

          {/* 디버그 토글 */}
          <Button
            variant={showDebug ? 'default' : 'secondary'}
            onClick={() => setShowDebug((v) => !v)}
            className="w-full gap-2"
          >
            <Bug className="w-4 h-4" />
            {showDebug ? '디버그 접기' : '디버그 열기'}
          </Button>

          {showDebug && (
            <div className="space-y-2 text-xs">
              <div className="text-muted-foreground">테스트 퀵점프</div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeByMap(37.5665, 126.978)}
                >
                  서울
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeByMap(35.1796, 129.0756)}
                >
                  부산
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeByMap(33.4996, 126.5312)}
                >
                  제주
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeByMap(clampLat(lat + 0.01), lng)}
                >
                  +0.01° 위도
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChangeByMap(lat, clampLng(lng + 0.01))}
                >
                  +0.01° 경도
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mapRef.current?.invalidateSize()}
                >
                  사이즈 보정(invalidateSize)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const center = L.latLng(lat, lng)
                    const z = mapRef.current
                      ? Math.max(12, mapRef.current.getZoom())
                      : 12
                    mapRef.current?.flyTo(center, z)
                  }}
                >
                  <Crosshair className="w-3 h-3 mr-1" />
                  센터로
                </Button>
              </div>
              <div className="text-muted-foreground">
                URL 해시 동기화: <code>#{`lat=${lat}&lng=${lng}`}</code>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 지도 */}
      <ClientOnly>
        <MapContainer
          center={[lat, lng]}
          zoom={10}
          className="h-full w-full"
          style={{ height: '100vh', width: '100vw' }}
        >
          <OnReady
            onReady={(map) => {
              mapRef.current = map
              setTimeout(() => map.invalidateSize(), 0)
            }}
          />

          {/* OSM 타일 */}
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 축척 컨트롤 */}
          <ScaleControl position="bottomleft" imperial={false} />

          {/* 이동 라인 (트랙) */}
          {points.length > 1 && (
            <Polyline
              positions={
                points.map((p) => [p.lat, p.lng]) as L.LatLngExpression[]
              }
              pathOptions={{ weight: 4 }}
            />
          )}

          {/* 시작/현재 지점 마커 */}
          {points[0] && (
            <Marker position={[points[0].lat, points[0].lng]}>
              <Popup>출조 시작 지점</Popup>
            </Marker>
          )}
          {points.length > 1 && (
            <Marker
              position={[
                points[points.length - 1].lat,
                points[points.length - 1].lng,
              ]}
            >
              <Popup>현재(마지막) 위치</Popup>
            </Marker>
          )}

          {/* 선택 마커와 상호작용 */}
          <InteractiveMarker position={{ lat, lng }} onChange={onChangeByMap} />
          <LocateControl onLocated={onChangeByMap} />
        </MapContainer>
      </ClientOnly>
    </div>
  )
}
