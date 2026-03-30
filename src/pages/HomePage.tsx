import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  Trip,
  ConditionSnapshot,
  RigPreset,
  EgiPreset,
  CatchEvent,
} from '@/db/schema'
import { TodayBar } from '@/components/TodayBar'
import { ConditionsSnapshot } from '@/components/ConditionsSnapshot'
import { PresetSlots } from '@/components/PresetSlots'
import { LiveCatchButton } from '@/components/LiveCatchButton'
import { RecentEvents } from '@/components/RecentEvents'
import { MiniInsight } from '@/components/MiniInsight'
import { WeatherCard } from '@/components/WeatherCard'
import { TideCard } from '@/components/TideCard'
import { useGeolocation } from '@/hooks/useGeolocation'
import { queueForSync } from '@/lib/sync'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MapPin, Plus } from 'lucide-react'

// --- Types ---

type FishingType = 'walking' | 'boat'
type Species = 'cuttle' | 'webfoot' | 'bigfin'
type BoatPosition = 'bow' | 'middle' | 'stern'

const SPECIES_LABELS: Record<Species, string> = {
  cuttle: '갑오징어',
  webfoot: '주꾸미',
  bigfin: '무늬오징어',
}

const BOAT_POSITION_LABELS: Record<BoatPosition, string> = {
  bow: '선수',
  middle: '가운데',
  stern: '선미',
}

// --- StartTripDialog ---

interface StartTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: (tripData: Partial<Trip>) => Promise<void>
}

function StartTripDialog({ open, onOpenChange, onStart }: StartTripDialogProps) {
  const [fishingType, setFishingType] = useState<FishingType>('walking')
  const [species, setSpecies] = useState<Species | null>(null)
  const [boatCompany, setBoatCompany] = useState('')
  const [boatPosition, setBoatPosition] = useState<BoatPosition | null>(null)
  const [loading, setLoading] = useState(false)
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [now] = useState(() => new Date())

  useEffect(() => {
    if (!open || !navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [open])

  const reset = () => {
    setFishingType('walking')
    setSpecies(null)
    setBoatCompany('')
    setBoatPosition(null)
    setGps(null)
  }

  const handleStart = async () => {
    if (!species) return
    setLoading(true)
    try {
      await onStart({
        fishingType,
        species,
        lat: gps?.lat,
        lng: gps?.lng,
        ...(fishingType === 'boat' && {
          boatCompany: boatCompany || undefined,
          boatPosition: boatPosition ?? undefined,
        }),
      })
      reset()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>출조 시작</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <div className="font-medium">{dateStr} {timeStr}</div>
            <div className="text-muted-foreground">
              {gps ? `GPS ±${gps.accuracy}m (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})` : '위치 확인 중...'}
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">낚시 유형</Label>
            <div className="bg-muted rounded-full p-1 flex gap-1">
              {(['walking', 'boat'] as const).map((type) => (
                <button key={type} type="button" onClick={() => setFishingType(type)}
                  className={cn('flex-1 rounded-full py-2 text-sm font-medium transition-all',
                    fishingType === type ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {type === 'walking' ? '워킹' : '선상'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">어종</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(SPECIES_LABELS) as [Species, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSpecies(key)}
                  className={cn('h-14 rounded-lg border text-sm font-medium transition-all',
                    species === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {fishingType === 'boat' && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <Label htmlFor="boatCompany">선사명</Label>
                <Input id="boatCompany" value={boatCompany} onChange={(e) => setBoatCompany(e.target.value)} placeholder="선사명 입력" className="h-12 mt-1" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">좌석 위치</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(BOAT_POSITION_LABELS) as [BoatPosition, string][]).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setBoatPosition(key)}
                      className={cn('h-12 rounded-lg border text-sm font-medium transition-all',
                        boatPosition === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleStart} disabled={!species || loading} className="w-full h-14 text-base font-semibold">
            출조 시작
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- EndTripDialog ---

function EndTripDialog({ open, onOpenChange, trip, onEnd }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: Trip | null
  onEnd: (notes: string) => Promise<void>
}) {
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)

  const catches = useLiveQuery(
    async () => (trip?.id ? await db.catchEvents.where('tripId').equals(trip.id).toArray() : []),
    [trip?.id]
  )

  const total = (catches ?? []).length

  const breakdown = useMemo(() => {
    return (catches ?? []).reduce(
      (acc, c) => {
        const key = (c.species ?? 'cuttle') as Species
        return { ...acc, [key]: (acc[key] ?? 0) + 1 }
      },
      {} as Record<string, number>
    )
  }, [catches])

  const elapsed = useMemo(() => {
    if (!trip?.dateStart) return ''
    const ms = Date.now() - new Date(trip.dateStart).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`
  }, [trip?.dateStart])

  const startTime = trip?.dateStart ? new Date(trip.dateStart).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''
  const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  const handleEnd = async () => {
    setLoading(true)
    try { await onEnd(memo); setMemo(''); onOpenChange(false) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>출조 종료</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">출조 시간</span>
              <span className="font-medium">{startTime} ~ {nowTime} ({elapsed})</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">총 조획</span>
              <span className="text-2xl font-bold">{total}마리</span>
            </div>
            {total > 0 && (
              <>
                <Separator />
                {Object.entries(breakdown).filter(([, cnt]) => cnt > 0).map(([key, cnt]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{SPECIES_LABELS[key as Species] ?? key}</span>
                    <span className="font-medium">{cnt}마리</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div>
            <Label htmlFor="endMemo">메모</Label>
            <Textarea id="endMemo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오늘 출조 소감..." rows={3} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => onOpenChange(false)} disabled={loading}>취소</Button>
            <Button onClick={handleEnd} disabled={loading} variant="destructive" className="flex-1 h-12 text-base font-semibold">종료 확인</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- HomePage (대시보드 레이아웃 복원 + 신규 다이얼로그 통합) ---

export default function HomePage() {
  const { position } = useGeolocation()
  const [activeRigSlot, setActiveRigSlot] = useState<'A' | 'B' | 'C'>('A')
  const [activeEgiSlot, setActiveEgiSlot] = useState<'A' | 'B' | 'C'>('A')
  const [tripDialogOpen, setTripDialogOpen] = useState(false)
  const [endTripOpen, setEndTripOpen] = useState(false)

  // 현재 진행중 Trip
  const currentTrip = useLiveQuery(async () => {
    const trips = await db.trips.toArray()
    return trips.filter((t) => !t.dateEnd).sort((a, b) => new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime())[0] ?? null
  }, []) as Trip | null

  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) as RigPreset[] | undefined
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) as EgiPreset[] | undefined

  const recentEvents = useLiveQuery(async () => {
    const arr = await db.catchEvents.toArray()
    return arr.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10)
  }, []) as CatchEvent[] | undefined

  const allEvents = useLiveQuery(() => db.catchEvents.toArray(), []) as CatchEvent[] | undefined
  const allConditions = useLiveQuery(() => db.conditions.toArray(), []) as ConditionSnapshot[] | undefined

  const latestCondition: ConditionSnapshot | null = useMemo(() => {
    if (!currentTrip?.id || !allConditions?.length) return null
    const mine = allConditions.filter((c) => c.tripId === currentTrip.id)
    if (mine.length === 0) return null
    return mine.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
  }, [currentTrip?.id, allConditions])

  // 출조 시작 (StartTripDialog에서 호출)
  const handleStartTrip = async (tripData: Partial<Trip>) => {
    const base: Trip = {
      dateStart: new Date(),
      lat: tripData.lat ?? position?.lat,
      lng: tripData.lng ?? position?.lng,
      ...tripData,
    }
    const id = await db.trips.add(base)
    await queueForSync('trip', { action: 'start', id, ...base })
    toast.success('출조가 시작되었습니다')
  }

  // TodayBar에서 직접 출조 시작 (간편)
  const handleQuickStartTrip = async () => {
    setTripDialogOpen(true)
  }

  // 출조 종료
  const handleEndTrip = async (notes: string) => {
    if (!currentTrip?.id) return
    const dateEnd = new Date()
    await db.trips.update(currentTrip.id, { dateEnd, notes: notes || undefined })
    await queueForSync('trip', { action: 'end', id: currentTrip.id, dateEnd })
    toast.success('출조가 종료되었습니다')
  }

  // TodayBar에서 종료 버튼 클릭
  const handleTodayBarEndTrip = async () => {
    setEndTripOpen(true)
  }

  // 출조 중 캐치 카운트
  const tripCatchCount = useLiveQuery(
    async () => (currentTrip?.id ? await db.catchEvents.where('tripId').equals(currentTrip.id).count() : 0),
    [currentTrip?.id]
  )

  const tripElapsed = useMemo(() => {
    if (!currentTrip?.dateStart) return ''
    const ms = Date.now() - new Date(currentTrip.dateStart).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`
  }, [currentTrip?.dateStart])

  // ─── 출조 중: 심플 캐치 모드 ───
  if (currentTrip) {
    return (
      <div className="min-h-screen bg-background pb-20 px-4 max-w-lg mx-auto">
        <div className="pt-4 flex flex-col gap-4">
          {/* 상단 상태바 */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-primary">
                출조 진행 중
              </span>
              <span className="text-xs text-muted-foreground">{tripElapsed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {SPECIES_LABELS[currentTrip.species as Species] ?? ''}
                {currentTrip.fishingType === 'boat' ? ' · 선상' : ' · 워킹'}
                {currentTrip.boatCompany ? ` · ${currentTrip.boatCompany}` : ''}
              </span>
              <span className="text-3xl font-bold">{tripCatchCount ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">마리</span></span>
            </div>
          </div>

          {/* 프리셋 슬롯 선택 (컴팩트) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">단차</Label>
              <div className="flex gap-1">
                {(['A', 'B', 'C'] as const).map((slot) => (
                  <Button key={slot} variant={activeRigSlot === slot ? 'default' : 'outline'}
                    className="flex-1 h-10 text-sm" onClick={() => setActiveRigSlot(slot)}>
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">에기</Label>
              <div className="flex gap-1">
                {(['A', 'B', 'C'] as const).map((slot) => (
                  <Button key={slot} variant={activeEgiSlot === slot ? 'default' : 'outline'}
                    className="flex-1 h-10 text-sm" onClick={() => setActiveEgiSlot(slot)}>
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* 메인 캐치 버튼 */}
          <LiveCatchButton
            tripId={currentTrip.id ?? null}
            rigSlot={activeRigSlot}
            egiSlot={activeEgiSlot}
          />

          {/* 출조 종료 */}
          <Button onClick={() => setEndTripOpen(true)} variant="outline" className="w-full h-12 text-muted-foreground">
            출조 종료
          </Button>
        </div>

        <EndTripDialog open={endTripOpen} onOpenChange={setEndTripOpen} trip={currentTrip} onEnd={handleEndTrip} />
      </div>
    )
  }

  // ─── 대시보드 모드 (출조 미진행) ───
  return (
    <div className="min-h-screen bg-background pb-20 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="pt-3 flex flex-col gap-3 md:gap-4">
        <TodayBar
          currentTrip={currentTrip}
          onStartTrip={handleQuickStartTrip}
          onEndTrip={handleTodayBarEndTrip}
          onSelectSpot={() => { window.location.href = '/map?focus=me' }}
        />

        {/* 빠른 실행 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button onClick={() => { window.location.href = '/map?focus=me' }} className="w-full" size="lg" variant="secondary">
            <MapPin className="w-4 h-4 mr-2" /> 포인트 선택
          </Button>
          <Button onClick={() => { window.location.href = '/presets' }} className="w-full" size="lg" variant="outline">
            <Plus className="w-4 h-4 mr-2" /> 프리셋 편집
          </Button>
        </div>

        {/* 현황 스냅샷 */}
        <ConditionsSnapshot
          condition={latestCondition}
          lastFetched={latestCondition?.at}
          onRefresh={() => toast.info('조건 갱신: API 연동 후 자동 갱신됩니다')}
          onEdit={() => toast.info('수동 입력 기능은 곧 추가됩니다')}
        />

        {/* 날씨 / 물때 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <WeatherCard />
          <TideCard />
        </div>

        {/* 프리셋 슬롯 */}
        <PresetSlots
          rigPresets={rigPresets ?? []}
          egiPresets={egiPresets ?? []}
          activeRigSlot={activeRigSlot}
          activeEgiSlot={activeEgiSlot}
          onRigSlotChange={setActiveRigSlot}
          onEgiSlotChange={setActiveEgiSlot}
        />

        {/* 최근 이벤트 & 미니 인사이트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RecentEvents events={recentEvents ?? []} rigPresets={rigPresets ?? []} egiPresets={egiPresets ?? []} />
          </div>
          <div>
            <MiniInsight events={allEvents ?? []} conditions={allConditions ?? []} currentTideStage={undefined} />
          </div>
        </div>
      </div>

      <StartTripDialog open={tripDialogOpen} onOpenChange={setTripDialogOpen} onStart={handleStartTrip} />
    </div>
  )
}
