import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import * as L from 'leaflet'
import { db } from '@/db/schema'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SPECIES_COLOR, SPECIES_LABEL, SPECIES_OPTIONS } from '@/constants/species'

function makeSpotIcon(color: string): L.DivIcon {
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

export default function CommunityPage() {
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])

  const allPublicSpots = useLiveQuery(
    () => db.spots.filter((s) => s.isPublic === true).toArray(),
    []
  ) ?? []

  const filtered = selectedSpecies.length === 0
    ? allPublicSpots
    : allPublicSpots.filter((s) => {
        // spots don't have species directly — show all when no filter
        return true
      })

  // Get trips associated with public spots to know species
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? []

  const spotsWithSpecies = filtered.map((spot) => {
    // find the most recent trip matching this spot name
    const relatedTrip = trips
      .filter((t) => t.spotName === spot.name && t.species != null)
      .sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime())[0]
    return { ...spot, species: relatedTrip?.species }
  })

  const displaySpots = selectedSpecies.length === 0
    ? spotsWithSpecies
    : spotsWithSpecies.filter((s) => s.species != null && selectedSpecies.includes(s.species))

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Filter bar */}
      <div className="fixed top-0 left-0 right-0 z-[1000] h-12 bg-background/95 backdrop-blur border-b flex items-center px-3 gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0">어종</span>
        <ToggleGroup
          type="multiple"
          value={selectedSpecies}
          onValueChange={setSelectedSpecies}
          className="gap-1"
        >
          {SPECIES_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="h-7 px-2 text-xs"
              style={
                selectedSpecies.includes(opt.value)
                  ? { backgroundColor: SPECIES_COLOR[opt.value], color: '#fff', borderColor: SPECIES_COLOR[opt.value] }
                  : undefined
              }
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="ml-auto text-xs text-muted-foreground">{displaySpots.length}개</span>
      </div>

      {/* Map */}
      <div className="h-full w-full pt-12">
        <MapContainer
          center={[36.0, 127.5]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {displaySpots.map((spot) => {
            if (spot.lat == null || spot.lng == null) return null
            const color = spot.species ? (SPECIES_COLOR[spot.species] ?? '#666') : '#666'
            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={makeSpotIcon(color)}
              >
                <Popup>
                  <div className="text-sm space-y-1 min-w-[100px]">
                    <p className="font-semibold">{spot.name || '이름 없음'}</p>
                    {spot.species && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: color, color }}
                      >
                        {SPECIES_LABEL[spot.species]}
                      </Badge>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Empty state overlay */}
      {displaySpots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <div className="bg-background/90 rounded-lg px-4 py-3 text-center">
            <p className="text-sm font-medium">공개된 포인트가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">포인트를 공개로 설정하면 여기에 표시됩니다</p>
          </div>
        </div>
      )}
    </div>
  )
}
