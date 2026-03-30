import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, Trip, CatchEvent, ConditionSnapshot } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { SpotVisibilityToggle } from '@/components/spot/SpotVisibilityToggle'
import { ShareButton } from '@/components/trip/ShareButton'
import { SPECIES_LABEL } from '@/constants/species'

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

// --- Sub-components ---

interface TripHeaderCardProps {
  trip: Trip
  isPublic: boolean
  onVisibilityChange: (next: boolean) => void
}

function TripHeaderCard({ trip, isPublic, onVisibilityChange }: TripHeaderCardProps) {
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
        <Separator />
        <SpotVisibilityToggle isPublic={isPublic} onChange={onVisibilityChange} />
      </CardContent>
    </Card>
  )
}

function CatchSummaryCard({ catchEvents }: { catchEvents: CatchEvent[] }) {
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
                className="h-full bg-primary rounded-full transition-all"
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

function CatchTimelineCard({ catchEvents }: { catchEvents: CatchEvent[] }) {
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
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary mt-1 shrink-0" />
                {idx < catchEvents.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1" />
                )}
              </div>
              {/* Content */}
              <div className="pb-4 flex-1">
                <p className="text-sm font-medium">{formatTime(event.at)}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    단차{event.rigSlot}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    에기{event.egiSlot}
                  </Badge>
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
                {event.photoThumb && (
                  <img
                    src={event.photoThumb}
                    alt="catch photo"
                    className="w-16 h-16 object-cover rounded mt-2 border"
                  />
                )}
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

function EnvironmentCard({ conditions }: { conditions: ConditionSnapshot[] }) {
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
          {latest.waterColor && (
            <div>
              <p className="text-muted-foreground">물색</p>
              <p className="font-medium">{latest.waterColor}</p>
            </div>
          )}
          {latest.currentStrength && (
            <div>
              <p className="text-muted-foreground">조류</p>
              <p className="font-medium">{latest.currentStrength}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function EditNotesSection({
  initialNotes,
  onSave,
}: {
  initialNotes?: string
  onSave: (notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(notes)
      toast.success('메모 저장 완료')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">메모</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="출조 메모를 입력하세요..."
          rows={3}
        />
        <Button onClick={handleSave} disabled={saving} className="w-full h-12">
          메모 저장
        </Button>
      </CardContent>
    </Card>
  )
}

// --- Page ---

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  // Spot public visibility — must be declared before any early returns (Rules of Hooks)
  const spotId = trip?.spotId
  const spot = useLiveQuery<import('@/db/schema').Spot | undefined>(
    async () => {
      if (!spotId) return undefined
      return db.spots.where('name').equals(spotId).first()
    },
    [spotId]
  )

  if (tripIdNum == null || isNaN(tripIdNum)) {
    return (
      <div className="p-4 text-center text-muted-foreground">잘못된 접근입니다</div>
    )
  }

  if (trip === undefined) {
    return <div className="p-4 text-center text-muted-foreground">불러오는 중...</div>
  }

  if (trip === null) {
    return <div className="p-4 text-center text-muted-foreground">출조 기록을 찾을 수 없습니다</div>
  }

  const spotIsPublic = spot?.isPublic ?? false

  const handleVisibilityChange = async (next: boolean) => {
    if (spot?.id != null) {
      await db.spots.update(spot.id, { isPublic: next })
      toast.success(next ? '포인트를 공개했습니다' : '포인트를 비공개로 변경했습니다')
    }
  }

  const handleSaveNotes = async (notes: string) => {
    if (trip.id == null) return
    await db.trips.update(trip.id, { notes })
  }

  const handleDelete = async () => {
    if (trip.id == null) return
    await db.trips.delete(trip.id)
    await db.catchEvents.where('tripId').equals(trip.id).delete()
    await db.trackPoints.where('tripId').equals(trip.id).delete()
    toast.success('출조 기록이 삭제되었습니다')
    navigate('/log', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {formatDate(trip.dateStart)}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {trip.id != null && <ShareButton tripId={trip.id} />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        <TripHeaderCard
          trip={trip}
          isPublic={spotIsPublic}
          onVisibilityChange={handleVisibilityChange}
        />
        <CatchSummaryCard catchEvents={catchEvents} />
        <CatchTimelineCard catchEvents={catchEvents} />
        <EnvironmentCard conditions={conditions} />
        <EditNotesSection initialNotes={trip.notes} onSave={handleSaveNotes} />
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>출조 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 출조 기록과 관련된 모든 데이터(조과, 트랙 포인트)가 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
