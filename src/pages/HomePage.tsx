// src/pages/HomePage.tsx
// 홈 레이아웃 정리 (TodayBar에만 출조 시작/종료 유지, 빠른 실행의 중복 버튼 제거)
// 2025-11-03 office 2차

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
import { useToast } from '@/hooks/use-toast'
import { queueForSync } from '@/lib/sync'
import { Button } from '@/components/ui/button'
import { MapPin, Plus } from 'lucide-react'

export default function HomePage() {
  const { position, error: geoError } = useGeolocation()
  const { toast } = useToast()

  // ── 프리셋 활성 슬롯 상태 (A/B/C)
  const [activeRigSlot, setActiveRigSlot] = useState<'A' | 'B' | 'C'>('A')
  const [activeEgiSlot, setActiveEgiSlot] = useState<'A' | 'B' | 'C'>('A')

  // ── 현재 진행중 Trip (dateEnd가 없는 최신 트립)
  const currentTrip = useLiveQuery(async () => {
    const trips = await db.trips.toArray()
    const active = trips
      .filter((t) => !t.dateEnd)
      .sort(
        (a, b) =>
          new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime()
      )[0]
    return active ?? null
  }, []) as Trip | null

  // ── 프리셋 / 최근 이벤트 / 전체 이벤트/컨디션
  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) as
    | RigPreset[]
    | undefined
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) as
    | EgiPreset[]
    | undefined

  const recentEvents = useLiveQuery(async () => {
    const arr = await db.catchEvents.toArray()
    return arr
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10)
  }, []) as CatchEvent[] | undefined

  const allEvents = useLiveQuery(() => db.catchEvents.toArray(), []) as
    | CatchEvent[]
    | undefined
  const allConditions = useLiveQuery(() => db.conditions.toArray(), []) as
    | ConditionSnapshot[]
    | undefined

  const latestConditionForTrip: ConditionSnapshot | null = useMemo(() => {
    if (!currentTrip?.id || !allConditions?.length) return null
    const mine = allConditions.filter((c) => c.tripId === currentTrip.id)
    if (mine.length === 0) return null
    return mine.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    )[0]
  }, [currentTrip?.id, allConditions])

  // ── 핸들러: 출조 시작/종료 → TodayBar에서만 사용 (홈 빠른 실행에서는 제거)
  const handleStartTrip = async () => {
    try {
      const base: Trip = {
        dateStart: new Date(),
        lat: position?.lat,
        lng: position?.lng,
      }
      const id = await db.trips.add(base)
      await queueForSync('trip', { action: 'start', id, ...base })
      toast({ title: '출조 시작', description: '안전한 낚시 되세요!' })
    } catch (e) {
      console.error(e)
      toast({ title: '출조 시작 실패', variant: 'destructive' })
    }
  }

  const handleEndTrip = async () => {
    try {
      if (!currentTrip?.id) return
      const dateEnd = new Date()
      await db.trips.update(currentTrip.id, { dateEnd })
      await queueForSync('trip', { action: 'end', id: currentTrip.id, dateEnd })
      toast({
        title: '출조 종료',
        description: '수고하셨어요. 기록은 나중에 이어서 편집할 수 있어요.',
      })
    } catch (e) {
      console.error(e)
      toast({ title: '출조 종료 실패', variant: 'destructive' })
    }
  }

  const handleSelectSpot = () => {
    window.location.href = '/map?focus=me'
  }

  const handleNewPreset = () => {
    window.location.href = '/presets'
  }

  const handleRefreshConditions = () => {
    toast({ title: '조건 갱신', description: 'API 연동 후 자동 갱신됩니다' })
  }

  const handleEditConditions = () => {
    toast({ title: '조건 수정', description: '수동 입력 기능은 곧 추가됩니다' })
  }

  // 위치 오류 안내 (옵션)
  useEffect(() => {
    if (geoError) {
      toast({
        title: '위치 접근 실패',
        description: geoError,
        variant: 'destructive',
      })
    }
  }, [geoError, toast])

  return (
    <div className="min-h-screen bg-background pb-20 px-4 md:px-6 max-w-5xl mx-auto">
      {/* 섹션 간격은 gap으로만 관리 */}
      <div className="pt-3 flex flex-col gap-3 md:gap-4">
        {/* TodayBar (여기에만 출조 시작/종료 버튼 존재) */}
        <TodayBar
          currentTrip={currentTrip}
          onStartTrip={handleStartTrip}
          onEndTrip={handleEndTrip}
          onSelectSpot={handleSelectSpot}
        />

        {/* 빠른 실행: 포인트 선택 / 갑오징어 기록 / 프리셋 추가·편집 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button
            onClick={handleSelectSpot}
            className="w-full"
            size="lg"
            variant="secondary"
          >
            <MapPin className="w-4 h-4 mr-2" /> 포인트 선택
          </Button>

          <LiveCatchButton
            tripId={currentTrip?.id ?? null}
            rigSlot={activeRigSlot}
            egiSlot={activeEgiSlot}
          />

          <Button
            onClick={handleNewPreset}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" /> 프리셋 추가/편집
          </Button>
        </div>

        {/* 현황 스냅샷 */}
        <ConditionsSnapshot
          condition={latestConditionForTrip}
          lastFetched={latestConditionForTrip?.at}
          onRefresh={handleRefreshConditions}
          onEdit={handleEditConditions}
        />

        {/* 날씨/물때 2열 */}
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
            <RecentEvents
              events={recentEvents ?? []}
              rigPresets={rigPresets ?? []}
              egiPresets={egiPresets ?? []}
            />
          </div>
          <div>
            <MiniInsight
              events={allEvents ?? []}
              conditions={allConditions ?? []}
              currentTideStage={currentTrip?.tideStage}
            />
          </div>
        </div>
      </div>

      {/* BottomNav 여유 공간 */}
      <div className="h-24" />
    </div>
  )
}
