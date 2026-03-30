// src/components/map/CatchMarkerLayer.tsx
import * as L from 'leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import { Marker, Popup } from 'react-leaflet'
import { db, CatchEvent, Trip } from '@/db/schema'
import { MapFilterState } from '@/types/mapFilter'
import { SPECIES_COLOR, SPECIES_LABEL } from '@/constants/species'

function makeDivIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      border-radius:50%;
      background:${color};
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

/* ── Tide group helper ── */
type TideGroup = 'sari' | 'middle' | 'jogeum'
function tideGroup(stage?: number): TideGroup | null {
  if (stage == null) return null
  if (stage >= 1 && stage <= 4) return 'sari'
  if (stage >= 5 && stage <= 10) return 'middle'
  if (stage >= 11 && stage <= 15) return 'jogeum'
  return null
}

/* ── Period filter ── */
function periodCutoff(period: MapFilterState['period']): Date | null {
  if (period === 'all') return null
  const now = new Date()
  const months = period === '1m' ? 1 : period === '3m' ? 3 : 6
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - months)
  return cutoff
}

interface Props {
  filter: MapFilterState
}

export default function CatchMarkerLayer({ filter }: Props) {
  // All hooks at top level — unconditional
  const events = useLiveQuery(() => db.catchEvents.toArray(), []) ?? []
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? []
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) ?? []

  const tripMap = new Map<number, Trip>(
    trips
      .filter((t): t is Trip & { id: number } => t.id != null)
      .map((t) => [t.id!, t])
  )

  const cutoff = periodCutoff(filter.period)

  const filtered = events.filter((ev: CatchEvent) => {
    // period filter
    if (cutoff && new Date(ev.at) < cutoff) return false

    // fishingType filter
    if (filter.fishingType !== '') {
      const trip = ev.tripId != null ? tripMap.get(ev.tripId) : undefined
      if (!trip || trip.fishingType !== filter.fishingType) return false
    }

    // tideGroup filter
    if (filter.tideGroup.length > 0) {
      const trip = ev.tripId != null ? tripMap.get(ev.tripId) : undefined
      const tg = tideGroup(trip?.tideStage)
      if (!tg || !filter.tideGroup.includes(tg)) return false
    }

    // species filter
    if (filter.species.length > 0) {
      if (!ev.species || !filter.species.includes(ev.species)) return false
    }

    // egiColors filter
    if (filter.egiColors.length > 0) {
      const preset = egiPresets.find((e) => e.slot === ev.egiSlot)
      if (!preset?.color || !filter.egiColors.includes(preset.color)) return false
    }

    return true
  })

  return (
    <>
      {filtered.map((ev) => {
        // Resolve lat/lng: event's own coords, or fall back to trip coords
        const trip = ev.tripId != null ? tripMap.get(ev.tripId) : undefined
        const lat = ev.lat ?? trip?.lat
        const lng = ev.lng ?? trip?.lng

        if (lat == null || lng == null || (lat === 0 && lng === 0)) return null

        const color = SPECIES_COLOR[ev.species ?? ''] ?? '#666'
        const icon = makeDivIcon(color)
        const label = SPECIES_LABEL[ev.species ?? ''] ?? '미상'

        const egiPreset = egiPresets.find((e) => e.slot === ev.egiSlot)
        const egiInfo = egiPreset
          ? `${egiPreset.size ?? '?'}호 ${egiPreset.color ?? '?'}`
          : ev.egiSlot

        const timeStr = new Date(ev.at).toLocaleString('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <Marker
            key={ev.id}
            position={[lat, lng] as L.LatLngExpression}
            icon={icon}
          >
            <Popup>
              <div className="text-sm space-y-1 min-w-[120px]">
                <div className="font-semibold" style={{ color }}>{label}</div>
                <div className="text-xs text-muted-foreground">{timeStr}</div>
                {ev.sizeCm && <div>크기: {ev.sizeCm}cm</div>}
                <div>에기: {egiInfo}</div>
                {trip?.spotName && <div>포인트: {trip.spotName}</div>}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
