import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import { SPECIES_LABEL } from '@/constants/species'

type Period = 'month' | 'all'

function getRankBadge(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}`
}

function getMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

interface CatchRankEntry {
  rank: number
  label: string
  count: number
  speciesBreakdown: Record<string, number>
}

interface TripRankEntry {
  rank: number
  label: string
  tripCount: number
  totalCatch: number
}

function CatchRankingList({ entries }: { entries: CatchRankEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        데이터가 없습니다
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.label}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{getRankBadge(entry.rank)}</span>
                <div>
                  <p className="font-medium text-sm">{entry.label}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(entry.speciesBreakdown).map(([sp, cnt]) => (
                      <Badge key={sp} variant="secondary" className="text-xs">
                        {SPECIES_LABEL[sp] ?? sp} {cnt}수
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">{entry.count}수</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TripRankingList({ entries }: { entries: TripRankEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        데이터가 없습니다
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.label}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{getRankBadge(entry.rank)}</span>
                <div>
                  <p className="font-medium text-sm">{entry.label}</p>
                  <p className="text-xs text-muted-foreground">총 조과 {entry.totalCatch}수</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">{entry.tripCount}회</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('month')

  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? []
  const catchEvents = useLiveQuery(() => db.catchEvents.toArray(), []) ?? []

  const monthStart = getMonthStart()

  const filteredTrips = period === 'month'
    ? trips.filter((t) => new Date(t.dateStart) >= monthStart)
    : trips

  const filteredCatches = period === 'month'
    ? catchEvents.filter((c) => new Date(c.at) >= monthStart)
    : catchEvents

  // Catch ranking — aggregated by spot name (or "내 기록" as placeholder)
  // Since multi-user is not yet implemented, we show own records grouped by spot
  const catchBySpot: Record<string, { count: number; breakdown: Record<string, number> }> = {}
  filteredCatches.forEach((ev) => {
    const trip = trips.find((t) => t.id === ev.tripId)
    const key = trip?.spotName || '미지정 포인트'
    if (!catchBySpot[key]) {
      catchBySpot[key] = { count: 0, breakdown: {} }
    }
    catchBySpot[key].count += 1
    const sp = ev.species ?? 'cuttle'
    catchBySpot[key].breakdown[sp] = (catchBySpot[key].breakdown[sp] ?? 0) + 1
  })

  const catchRanking: CatchRankEntry[] = Object.entries(catchBySpot)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([label, data], idx) => ({
      rank: idx + 1,
      label,
      count: data.count,
      speciesBreakdown: data.breakdown,
    }))

  // Trip ranking — grouped by month or by spot
  const tripsBySpot: Record<string, { tripCount: number; totalCatch: number }> = {}
  filteredTrips.forEach((trip) => {
    const key = trip.spotName || '미지정 포인트'
    if (!tripsBySpot[key]) {
      tripsBySpot[key] = { tripCount: 0, totalCatch: 0 }
    }
    tripsBySpot[key].tripCount += 1
    const catchCount = catchEvents.filter((c) => c.tripId === trip.id).length
    tripsBySpot[key].totalCatch += catchCount
  })

  const tripRanking: TripRankEntry[] = Object.entries(tripsBySpot)
    .sort((a, b) => b[1].tripCount - a[1].tripCount)
    .slice(0, 10)
    .map(([label, data], idx) => ({
      rank: idx + 1,
      label,
      tripCount: data.tripCount,
      totalCatch: data.totalCatch,
    }))

  // My summary stats
  const myTotalCatch = filteredCatches.length
  const myTotalTrips = filteredTrips.length

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">랭킹</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Period selector */}
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={(v) => v && setPeriod(v as Period)}
          className="w-full"
        >
          <ToggleGroupItem value="month" className="flex-1">
            이번 달
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="flex-1">
            전체
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Ranking tabs */}
        <Tabs defaultValue="catch">
          <TabsList className="w-full">
            <TabsTrigger value="catch" className="flex-1">조과수 랭킹</TabsTrigger>
            <TabsTrigger value="trips" className="flex-1">출조횟수 랭킹</TabsTrigger>
          </TabsList>
          <TabsContent value="catch" className="pt-3">
            <CatchRankingList entries={catchRanking} />
          </TabsContent>
          <TabsContent value="trips" className="pt-3">
            <TripRankingList entries={tripRanking} />
          </TabsContent>
        </Tabs>
      </div>

      {/* My ranking card — fixed at bottom above BottomNav */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4">
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">내 기록</p>
                <p className="text-sm font-semibold">
                  {period === 'month' ? '이번 달' : '전체'}
                </p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xs text-muted-foreground">출조</p>
                  <p className="text-lg font-bold text-primary">{myTotalTrips}회</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">조과</p>
                  <p className="text-lg font-bold text-primary">{myTotalCatch}수</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
