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
} from 'lucide-react'

import ClientOnly from '@/components/ClientOnly'
import { useLocationStore } from '@/stores/locationStore'
import { useWeatherStore } from '@/stores/weatherStore'
import { useTideStore } from '@/stores/tideStore'

import { reverseGeocode } from '@/lib/geocoding'
import { resolveRegion, REGION_NAMES } from '@/config/regions'
import { findNearestStation } from '@/lib/tideExtreme'

/* ===================== 유틸/공통 ===================== */

const clampLat = (v: number) => Math.max(-85, Math.min(85, v))
const clampLng = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180

function isZeroZero(lat?: number | null, lng?: number | null) {
  return (lat === 0 && lng === 0) || lat == null || lng == null
}

function useApplyLocation() {
  const setCoords = useLocationStore((s) => s.setCoords)
  const setPlaceName = useLocationStore((s) => s.setPlaceName)
  const refreshWeather = useWeatherStore((s) => s.refresh)
  const refreshTide = useTideStore((s) => s.refresh)

  return async (lat: number, lng: number) => {
    setCoords(lat, lng)

    // 역지오코딩(비차단)
    reverseGeocode(lat, lng)
      .then((name) => name && setPlaceName(name))
      .catch((e) => console.warn('reverseGeocode failed:', e))

    // 날씨/조석 동시 갱신
    await Promise.allSettled([refreshWeather(lat, lng), refreshTide(lat, lng)])
  }
}

/* ===================== 서브 컴포넌트 ===================== */

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

  // 로컬 상태(입력/표시) — 기본은 서울, 단 첫 렌더에서 GPS 자동 보정
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

  // 자동 위치 파악은 한 번만
  const [autoLocated, setAutoLocated] = useState(false)

  // 디버그/테스트 패널
  const [showDebug, setShowDebug] = useState(false)

  // 베이스맵(모두 단일 호스트 — CSP 안정)
  const BASEMAPS = {
    OSM: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    CartoPositron:
      'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
    StamenTonerLite:
      'https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png',
  } as const
  const [basemap, setBasemap] = useState<keyof typeof BASEMAPS>('OSM')

  // 최초 진입 시: 스토어 좌표가 0,0 이거나 비어 있으면 GPS 자동 요청
  const mapRef = useRef<L.Map | null>(null)
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
          // 지도 준비되어 있으면 이동
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
          setAutoLocated(true) // 실패해도 반복 시도 방지
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      setAutoLocated(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latStore, lngStore, autoLocated])

  // 스토어 → 로컬 동기화(사용자가 다른 페이지에서 위치를 바꾼 후 돌아온 경우 대비)
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

  // URL 해시와 동기화(테스트 편의)
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

  // 권역/관측소 즉시 계산(표시용)
  const regionKey = useMemo(() => resolveRegion(lat, lng), [lat, lng])
  const regionLabel = REGION_NAMES[regionKey]
  const nearestStationName = useMemo(
    () => findNearestStation(lat, lng)?.name ?? stationName ?? '—',
    [lat, lng, stationName]
  )

  // 지도 리사이즈 보정
  const invalidate = () => mapRef.current?.invalidateSize()
  useEffect(() => {
    const onResize = () => invalidate()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 이벤트 핸들러
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

  const copyLatLng = async () => {
    try {
      await navigator.clipboard.writeText(`${lat},${lng}`)
      toast.success('좌표를 클립보드에 복사했습니다.')
    } catch {
      toast.error('클립보드 복사에 실패했습니다.')
    }
  }

  const hardRefreshWeather = () => {
    void refreshWeather(lat, lng)
      .then(() => toast.success('날씨 데이터를 새로고침했습니다.'))
      .catch(() => toast.error('날씨 새로고침 실패'))
  }
  const hardRefreshTide = () => {
    void refreshTide(lat, lng)
      .then(() => toast.success('조석 데이터를 새로고침했습니다.'))
      .catch(() => toast.error('조석 새로고침 실패'))
  }

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
            <Button variant="secondary" onClick={copyLatLng} className="gap-1">
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

          {/* 강제 새로고침 & 베이스맵 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={hardRefreshWeather}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 날씨 새로고침
            </Button>
            <Button
              variant="outline"
              onClick={hardRefreshTide}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 조석 새로고침
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <select
              value={basemap}
              onChange={(e) =>
                setBasemap(e.target.value as keyof typeof BASEMAPS)
              }
              className="border rounded px-2 py-1 text-sm w-full"
            >
              <option value="OSM">OSM (기본)</option>
              <option value="CartoPositron">Carto Positron</option>
              <option value="StamenTonerLite">Stamen Toner Lite</option>
            </select>
          </div>

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
                <Button variant="outline" size="sm" onClick={invalidate}>
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

          {/* 단일 호스트 타일(CSP 안전) */}
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url={BASEMAPS[basemap]}
          />

          {/* 축척 컨트롤 */}
          <ScaleControl position="bottomleft" imperial={false} />

          {/* 마커/상호작용 */}
          <InteractiveMarker position={{ lat, lng }} onChange={onChangeByMap} />
          <LocateControl onLocated={onChangeByMap} />
        </MapContainer>
      </ClientOnly>
    </div>
  )
}
