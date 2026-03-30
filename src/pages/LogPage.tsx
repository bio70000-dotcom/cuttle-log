import { useLiveQuery } from 'dexie-react-hooks'
import { db, Trip } from '@/db/schema'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function LogPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const trips = useLiveQuery(() => db.trips.reverse().toArray(), []) || []

  const filteredTrips = trips.filter((trip) => {
    if (!searchTerm) return true
    return trip.spotName?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4">출조 기록</h1>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="위치로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}

        {filteredTrips.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">출조 기록이 없습니다</p>
          </Card>
        )}
      </div>
    </div>
  )
}

const FISHING_TYPE_LABEL: Record<string, string> = {
  walking: '워킹',
  boat: '선상',
}

const SPECIES_LABEL: Record<string, string> = {
  cuttle: '갑오징어',
  webfoot: '주꾸미',
  bigfin: '무늬오징어',
}

function TripCard({ trip }: { trip: Trip }) {
  const navigate = useNavigate()

  const catchCount = useLiveQuery(
    () => db.catchEvents.where('tripId').equals(trip.id!).count(),
    [trip.id]
  )

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors active:bg-muted"
      onClick={() => navigate(`/log/${trip.id}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">{trip.spotName || '위치 미지정'}</h3>
          <p className="text-sm text-muted-foreground">{formatDate(trip.dateStart)}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{catchCount || 0}수</p>
          <p className="text-xs text-muted-foreground">조과</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {trip.fishingType && (
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {FISHING_TYPE_LABEL[trip.fishingType]}
          </span>
        )}
        {trip.species && (
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {SPECIES_LABEL[trip.species]}
          </span>
        )}
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{formatTime(trip.dateStart)}</span>
        {trip.dateEnd && <span>~ {formatTime(trip.dateEnd)}</span>}
        {trip.tideStage && <span>{trip.tideStage}물</span>}
      </div>

      {trip.notes && (
        <p className="text-sm mt-2 text-muted-foreground">{trip.notes}</p>
      )}
    </Card>
  )
}
