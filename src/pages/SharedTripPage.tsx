import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { db, Trip, CatchEvent, ConditionSnapshot } from '@/db/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SPECIES_LABEL, SPECIES_COLOR } from '@/constants/species'
import * as L from 'leaflet'

const FISHING_TYPE_LABEL: Record<string, string> = {
  walking: '워킹',
  boat: '선상',
}

const BOAT_POSITION_LABEL: Record<string, string> = {
  bow: '선수',
  middle: '가운데',
  stern: '선미',
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calcDuration(start: Date, end?: Date): string {
  if (!end) return '진행 중'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

function makeDotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:12px;height:12px;
      border-radius:50%;
      background:${color};
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.5);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

function SharedTripHeaderCard({ trip }: { trip: Trip }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          {trip.fishingType && (
            <Badge variant="secondary">{FISHING_TYPE_LABEL[trip.fishingType]}</Badge>
          )}
          {trip.species && (
            <Badge variant="outline">{SPECIES_LABEL[trip.species]}</Badge>
          )}
        </div>
        <div>
          <p className="font-semibold text-base">{trip.spotName || '위치 미지정'}</p>
          <p className="text-sm text-muted-foreground">{formatDate(trip.dateStart)}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatTime(trip.dateStart)}
          {trip.dateEnd && ` ~ ${formatTime(trip.dateEnd)}`}
          {' · '}
          {calcDuration(trip.dateStart, trip.dateEnd)}
        </p>
        {trip.fishingType === 'boat' && (trip.boatCompany || trip.boatPosition) && (
          <p className="text-sm text-muted-foreground">
            {trip.boatCompany && `선사: ${trip.boatCompany}`}
            {trip.boatCompany && trip.boatPosition && ' · '}
            {trip.boatPosition && `좌석: ${BOAT_POSITION_LABEL[trip.boatPosition]}`}
          </p>
        )}
        {trip.tideStage && (
          <p className="text-sm text-muted-foreground">{trip.tideStage}물</p>
        )}
      </CardContent>
    </Card>
  )
}

function SharedCatchSummary({ catchEvents }: { catchEvents: CatchEvent[] }) {
  const total = catchEvents.length
  const bySpecies: Record<string, number> = {}
  catchEvents.forEach((c) => {
    const key = c.species ?? 'cuttle'
    bySpecies[key] = (bySpecies[key] ?? 0) + 1
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">조과</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-4xl font-bold">{total}수</p>
        {Object.entries(bySpecies).map(([species, count]) => (
          <div key={species} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{SPECIES_LABEL[species] ?? species}</span>
              <span className="font-medium">{count}수</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        ))}
        {total === 0 && (
          <p className="text-sm text-muted-foreground">기록된 조과가 없습니다</p>
        )}
      </CardContent>
    </Card>
  )
}

function SharedTimeline({ catchEvents }: { catchEvents: CatchEvent[] }) {
  if (catchEvents.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">캐치 타임라인</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {catchEvents.map((event, idx) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary mt-1 shrink-0" />
                {idx < catchEvents.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>
              <div className="pb-4 flex-1">
                <p className="text-sm font-medium">{formatTime(event.at)}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.sizeCm && (
                    <Badge variant="outline" className="text-xs">
                      {event.sizeCm}cm
                    </Badge>
                  )}
                  {event.species && (
                    <Badge variant="outline" className="text-xs">
                      {SPECIES_LABEL[event.species]}
                    </Badge>
                  )}
                </div>
                {event.note && (
                  <p className="text-xs text-muted-foreground mt-1">{event.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SharedEnvironment({ conditions }: { conditions: ConditionSnapshot[] }) {
  if (conditions.length === 0) return null
  const latest = conditions[conditions.length - 1]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">환경 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {latest.waterTemp != null && (
            <div>
              <p className="text-muted-foreground">수온</p>
              <p className="font-medium">{latest.waterTemp}°C</p>
            </div>
          )}
          {latest.windDir && (
            <div>
              <p className="text-muted-foreground">풍향</p>
              <p className="font-medium">{latest.windDir}</p>
            </div>
          )}
          {latest.windSpeed != null && (
            <div>
              <p className="text-muted-foreground">풍속</p>
              <p className="font-medium">{latest.windSpeed}m/s</p>
            </div>
          )}
          {latest.waveHeight != null && (
            <div>
              <p className="text-muted-foreground">파고</p>
              <p className="font-medium">{latest.waveHeight}m</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SharedTripPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const tripIdNum = tripId ? parseInt(tripId, 10) : undefined

  const trip = useLiveQuery(
    () => (tripIdNum != null ? db.trips.get(tripIdNum) : undefined),
    [tripIdNum]
  )

  const catchEvents = useLiveQuery(
    () =>
      tripIdNum != null
        ? db.catchEvents.where('tripId').equals(tripIdNum).sortBy('at')
        : Promise.resolve([] as CatchEvent[]),
    [tripIdNum]
  ) ?? []

  const conditions = useLiveQuery(
    () =>
      tripIdNum != null
        ? db.conditions.where('tripId').equals(tripIdNum).sortBy('at')
        : Promise.resolve([] as ConditionSnapshot[]),
    [tripIdNum]
  ) ?? []

  if (tripIdNum == null || isNaN(tripIdNum)) {
    return <div className="p-4 text-center text-muted-foreground">잘못된 접근입니다</div>
  }

  if (trip === undefined) {
    return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>
  }

  if (trip === null) {
    return <div className="p-4 text-center text-muted-foreground">출조 기록을 찾을 수 없습니다</div>
  }

  const mapLat = trip.lat ?? 36.5
  const mapLng = trip.lng ?? 127.5
  const hasLocation = trip.lat != null && trip.lng != null

  const speciesColor = trip.species ? (SPECIES_COLOR[trip.species] ?? '#666') : '#666'
  const markerIcon = makeDotIcon(speciesColor)

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* App bar */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <h1 className="text-base font-semibold">공유된 출조 기록</h1>
        <p className="text-xs text-muted-foreground">cuttle-log</p>
      </div>

      {/* Mini map */}
      {hasLocation && (
        <div className="h-48 w-full">
          <MapContainer
            center={[mapLat, mapLng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[mapLat, mapLng]} icon={markerIcon}>
              <Popup>
                <span className="text-sm font-medium">{trip.spotName || '출조 포인트'}</span>
              </Popup>
            </Marker>
            {catchEvents
              .filter((ev) => ev.lat != null && ev.lng != null)
              .map((ev) => (
                <Marker
                  key={ev.id}
                  position={[ev.lat!, ev.lng!]}
                  icon={makeDotIcon(SPECIES_COLOR[ev.species ?? ''] ?? '#666')}
                />
              ))}
          </MapContainer>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">
        <SharedTripHeaderCard trip={trip} />
        <SharedCatchSummary catchEvents={catchEvents} />
        <SharedTimeline catchEvents={catchEvents} />
        <SharedEnvironment conditions={conditions} />
      </div>
    </div>
  )
}
