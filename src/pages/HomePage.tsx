import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, Trip } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import PresetEditor, { PresetValues } from '@/components/presets/PresetEditor'
import { cn } from '@/lib/utils'

type RigPresetRow = {
  id?: number
  slot: 'A' | 'B' | 'C'
  name?: string
  sinkerMode?: 'step' | 'custom'
  sinkerValue?: number | null
  sinkerPair?: [number, number] | null
  branchMode?: 'step' | 'custom'
  branchValue?: number | null
  branchPair?: [number, number] | null
  notes?: string
}

const TARGET_SLOT: RigPresetRow['slot'] = 'A'

function rowToValues(row?: RigPresetRow | null): PresetValues {
  if (!row) {
    return {
      sinkerStepType: 'step',
      sinkerStepValue: 0,
      branchLenType: 'step',
      branchLenValue: 0,
    }
  }
  return {
    sinkerStepType: row.sinkerMode ?? 'step',
    sinkerStepValue:
      (row.sinkerMode ?? 'step') === 'step' ? (row.sinkerValue ?? undefined) : undefined,
    sinkerCustomPair:
      (row.sinkerMode ?? 'step') === 'custom' ? (row.sinkerPair ?? undefined) : undefined,
    branchLenType: row.branchMode ?? 'step',
    branchLenValue:
      (row.branchMode ?? 'step') === 'step' ? (row.branchValue ?? undefined) : undefined,
    branchLenCustomPair:
      (row.branchMode ?? 'step') === 'custom' ? (row.branchPair ?? undefined) : undefined,
  }
}

function valuesToPartialRow(v: PresetValues): Partial<RigPresetRow> {
  return {
    sinkerMode: v.sinkerStepType,
    sinkerValue: v.sinkerStepType === 'step' ? (v.sinkerStepValue ?? 0) : undefined,
    sinkerPair: v.sinkerStepType === 'custom' ? (v.sinkerCustomPair ?? [0, 0]) : null,
    branchMode: v.branchLenType,
    branchValue: v.branchLenType === 'step' ? (v.branchLenValue ?? 0) : undefined,
    branchPair: v.branchLenType === 'custom' ? (v.branchLenCustomPair ?? [0, 0]) : null,
  }
}

function pretty(row?: RigPresetRow | null) {
  const sinker =
    row?.sinkerMode === 'custom'
      ? row.sinkerPair
        ? `${row.sinkerPair[0]} / ${row.sinkerPair[1]} cm`
        : '-'
      : row?.sinkerValue != null
        ? `${row.sinkerValue} cm`
        : '-'

  const branch =
    row?.branchMode === 'custom'
      ? row.branchPair
        ? `${row.branchPair[0]} / ${row.branchPair[1]} cm`
        : '-'
      : row?.branchValue != null
        ? `${row.branchValue} cm`
        : '-'

  return { sinker, branch }
}

// --- StartTripDialog ---

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
      const tripData: Partial<Trip> = {
        fishingType,
        species,
        lat: gps?.lat,
        lng: gps?.lng,
        ...(fishingType === 'boat' && {
          boatCompany: boatCompany || undefined,
          boatPosition: boatPosition ?? undefined,
        }),
      }
      await onStart(tripData)
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
          {/* Date/time + GPS */}
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <div className="font-medium">{dateStr} {timeStr}</div>
            <div className="text-muted-foreground">
              {gps ? `GPS ±${gps.accuracy}m (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})` : '위치 확인 중...'}
            </div>
          </div>

          {/* Fishing type pill toggle */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">낚시 유형</Label>
            <div className="bg-muted rounded-full p-1 flex gap-1">
              {(['walking', 'boat'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFishingType(type)}
                  className={cn(
                    'flex-1 rounded-full py-2 text-sm font-medium transition-all',
                    fishingType === type
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type === 'walking' ? '워킹' : '선상'}
                </button>
              ))}
            </div>
          </div>

          {/* Species selector */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">어종</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(SPECIES_LABELS) as [Species, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSpecies(key)}
                  className={cn(
                    'h-14 rounded-lg border text-sm font-medium transition-all',
                    species === key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Boat section (conditional) */}
          {fishingType === 'boat' && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <Label htmlFor="boatCompany">선사명</Label>
                <Input
                  id="boatCompany"
                  value={boatCompany}
                  onChange={(e) => setBoatCompany(e.target.value)}
                  placeholder="선사명 입력"
                  className="h-12 mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">좌석 위치</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(BOAT_POSITION_LABELS) as [BoatPosition, string][]).map(
                    ([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setBoatPosition(key)}
                        className={cn(
                          'h-12 rounded-lg border text-sm font-medium transition-all',
                          boatPosition === key
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={!species || loading}
            className="w-full h-14 text-base font-semibold"
          >
            출조 시작
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- HomePage ---

// --- EndTripDialog ---

type SpeciesBreakdownKey = 'cuttle' | 'webfoot' | 'bigfin'
const SPECIES_BREAKDOWN_LABELS: Record<SpeciesBreakdownKey, string> = {
  cuttle: '갑오징어',
  webfoot: '주꾸미',
  bigfin: '무늬오징어',
}

interface EndTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: Trip | null
  onEnd: (notes: string) => Promise<void>
}

function EndTripDialog({ open, onOpenChange, trip, onEnd }: EndTripDialogProps) {
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)

  const catches = useLiveQuery(
    async () => (trip?.id ? await db.catchEvents.where('tripId').equals(trip.id).toArray() : []),
    [trip?.id]
  )

  const breakdown = useMemo(() => {
    return (catches ?? []).reduce(
      (acc, c) => {
        const key = (c.species ?? 'cuttle') as SpeciesBreakdownKey
        return { ...acc, [key]: acc[key] + 1 }
      },
      { cuttle: 0, webfoot: 0, bigfin: 0 } as Record<SpeciesBreakdownKey, number>
    )
  }, [catches])

  const total = (catches ?? []).length

  const elapsed = useMemo(() => {
    if (!trip?.dateStart) return ''
    const ms = Date.now() - new Date(trip.dateStart).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}시간 ${m}분`
    return `${m}분`
  }, [trip?.dateStart])

  const startTime = trip?.dateStart
    ? new Date(trip.dateStart).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const nowTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  const handleEnd = async () => {
    setLoading(true)
    try {
      await onEnd(memo)
      setMemo('')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>출조 종료</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">출조 시간</span>
              <span className="font-medium">{startTime} ~ {nowTime} ({elapsed})</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">총 조획</span>
              <span className="text-2xl font-bold">{total}마리</span>
            </div>
            {total > 0 && (
              <>
                <Separator />
                {(Object.entries(breakdown) as [SpeciesBreakdownKey, number][])
                  .filter(([, cnt]) => cnt > 0)
                  .map(([key, cnt]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{SPECIES_BREAKDOWN_LABELS[key]}</span>
                      <span className="font-medium">{cnt}마리</span>
                    </div>
                  ))}
              </>
            )}
          </div>
          <div>
            <Label htmlFor="endMemo">메모 (선택)</Label>
            <Textarea
              id="endMemo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘 출조 소감을 남겨보세요..."
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleEnd}
              disabled={loading}
              variant="destructive"
              className="flex-1 h-12 text-base font-semibold"
            >
              종료 확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function HomePage() {
  const [presetOpen, setPresetOpen] = useState(false)
  const [tripOpen, setTripOpen] = useState(false)
  const [endTripOpen, setEndTripOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000)
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // Detect active trip (started but not ended)
  const activeTrip = useLiveQuery(async () => {
    const trips = await db.trips.orderBy('dateStart').reverse().limit(1).toArray()
    const latest = trips[0]
    if (latest && !latest.dateEnd) return latest
    return null
  })

  const rigPreset = useLiveQuery(async () => {
    return await db.rigPresets.where('slot').equals(TARGET_SLOT).first()
  }, [])

  useEffect(() => {
    ;(async () => {
      const exists = await db.rigPresets.where('slot').equals(TARGET_SLOT).first()
      if (!exists) {
        await db.rigPresets.add({
          slot: TARGET_SLOT,
          name: '슬롯 A',
          sinkerMode: 'step',
          sinkerValue: 0,
          branchMode: 'step',
          branchValue: 0,
        })
      }
    })().catch(console.error)
  }, [])

  const values = useMemo(() => rowToValues(rigPreset ?? undefined), [rigPreset])
  const view = useMemo(() => pretty(rigPreset ?? undefined), [rigPreset])

  const handleSavePreset = async (v: PresetValues) => {
    const patch = valuesToPartialRow(v)
    // Cast: null values are accepted by Dexie at runtime for clearing fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dexiePatch = patch as any
    if (rigPreset?.id) {
      await db.rigPresets.update(rigPreset.id, dexiePatch)
    } else {
      await db.rigPresets.add({ slot: TARGET_SLOT, ...dexiePatch })
    }
    showToast('success', '프리셋 저장 완료')
    setPresetOpen(false)
  }

  const handleStartTrip = async (tripData: Partial<Trip>) => {
    await db.trips.add({
      dateStart: new Date(),
      ...tripData,
    } as Trip)
    showToast('success', '출조가 시작되었습니다')
  }

  const handleEndTrip = async (notes: string) => {
    if (!activeTrip?.id) return
    await db.trips.update(activeTrip.id, {
      dateEnd: new Date(),
      notes: notes || undefined,
    })
    showToast('success', '출조가 종료되었습니다')
  }

  return (
    <div className="p-4 space-y-6">
      {/* Simple inline toast */}
      {toastMsg && (
        <div
          className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-xs w-full text-center',
            toastMsg.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-destructive text-destructive-foreground'
          )}
        >
          {toastMsg.text}
        </div>
      )}

      {/* Trip CTA — start or end */}
      {activeTrip ? (
        <div className="space-y-3">
          <div className="bg-primary/10 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">출조 진행 중 — </span>
            <span className="font-medium">
              {SPECIES_LABELS[activeTrip.species as Species] ?? ''}
              {activeTrip.fishingType === 'boat' ? ' (선상)' : ' (워킹)'}
            </span>
          </div>
          <Button
            onClick={() => setEndTripOpen(true)}
            variant="destructive"
            className="w-full h-14 text-base font-semibold"
          >
            출조 종료
          </Button>
          <EndTripDialog
            open={endTripOpen}
            onOpenChange={setEndTripOpen}
            trip={activeTrip}
            onEnd={handleEndTrip}
          />
        </div>
      ) : (
        <Button
          onClick={() => setTripOpen(true)}
          className="w-full h-14 text-base font-semibold"
        >
          출조 시작
        </Button>
      )}

      <StartTripDialog
        open={tripOpen}
        onOpenChange={setTripOpen}
        onStart={handleStartTrip}
      />

      {/* Preset card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">현재 프리셋 (슬롯 {TARGET_SLOT})</CardTitle>
          <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                프리셋 편집
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>프리셋 편집</DialogTitle>
              </DialogHeader>
              <PresetEditor
                initial={values}
                stepRange={{ min: 0, max: 200 }}
                onSave={handleSavePreset}
                onCancel={() => setPresetOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label className="text-sm text-muted-foreground">봉돌단차</Label>
              <div className="text-base">{view.sinker}</div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">가지줄길이</Label>
              <div className="text-base">{view.branch}</div>
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            * 5cm 단위 또는 사용자 지정(숫자 2개)을 지원합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">출조 세팅 (프리셋 적용 예시)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PresetConsumerDemo
            sinkerMode={rigPreset?.sinkerMode ?? 'step'}
            sinkerValue={rigPreset?.sinkerValue ?? 0}
            sinkerPair={rigPreset?.sinkerPair ?? null}
            branchMode={rigPreset?.branchMode ?? 'step'}
            branchValue={rigPreset?.branchValue ?? 0}
            branchPair={rigPreset?.branchPair ?? null}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function PresetConsumerDemo(props: {
  sinkerMode: 'step' | 'custom'
  sinkerValue: number
  sinkerPair: [number, number] | null
  branchMode: 'step' | 'custom'
  branchValue: number
  branchPair: [number, number] | null
}) {
  const sinkerNumbers =
    props.sinkerMode === 'custom'
      ? (props.sinkerPair ?? [0, 0])
      : [props.sinkerValue, props.sinkerValue]

  const branchNumbers =
    props.branchMode === 'custom'
      ? (props.branchPair ?? [0, 0])
      : [props.branchValue, props.branchValue]

  return (
    <div className="text-sm">
      <div>
        적용 봉돌단차(cm): {sinkerNumbers[0]} / {sinkerNumbers[1]}
      </div>
      <div>
        적용 가지줄길이(cm): {branchNumbers[0]} / {branchNumbers[1]}
      </div>
      <p className="text-muted-foreground mt-2">
        * custom이면 두 값을 모두 사용, step이면 단일 값을 복제해 사용합니다.
      </p>
    </div>
  )
}
