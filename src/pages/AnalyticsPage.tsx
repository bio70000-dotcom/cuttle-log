import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import { TrendingUp, Clock, Grid2x2, Anchor, Thermometer, Target, Ship } from 'lucide-react';

export default function AnalyticsPage() {
  const events = useLiveQuery(() => db.catchEvents.toArray(), []) || [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) || [];
  const conditions = useLiveQuery(() => db.conditions.toArray(), []) || [];
  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) || [];
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) || [];

  /* ── Rig combination ── */
  const rigComboCounts: Record<string, number> = {};
  events.forEach(event => {
    const rig = rigPresets.find(r => r.slot === event.rigSlot);
    if (rig) {
      const key = `${rig.sinkerDropLength || '?'}/${rig.branchLineLength || '?'}`;
      rigComboCounts[key] = (rigComboCounts[key] || 0) + 1;
    }
  });
  const rigComboData = Object.entries(rigComboCounts)
    .map(([combo, count]) => ({ combo, count }))
    .sort((a, b) => b.count - a.count);

  /* ── Egi combination ── */
  const egiComboCounts: Record<string, number> = {};
  events.forEach(event => {
    const egi = egiPresets.find(e => e.slot === event.egiSlot);
    if (egi) {
      const key = `${egi.size || '?'}호 ${egi.color || '?'}`;
      egiComboCounts[key] = (egiComboCounts[key] || 0) + 1;
    }
  });
  const egiComboData = Object.entries(egiComboCounts)
    .map(([combo, count]) => ({ combo, count }))
    .sort((a, b) => b.count - a.count);

  /* ── Tide stage ── */
  const byTideStage = trips.reduce((acc, trip) => {
    if (!trip.tideStage) return acc;
    const count = events.filter(e => e.tripId === trip.id).length;
    acc[trip.tideStage] = (acc[trip.tideStage] || 0) + count;
    return acc;
  }, {} as Record<number, number>);
  const tideData = Object.entries(byTideStage)
    .map(([stage, count]) => ({ stage: `${stage}물`, count }))
    .sort((a, b) => parseInt(a.stage) - parseInt(b.stage));

  /* ── Top performers ── */
  const performanceMap: Record<string, {
    count: number;
    tideStage?: number;
    rigCombo: string;
    egiCombo: string;
  }> = {};
  events.forEach(event => {
    const rig = rigPresets.find(r => r.slot === event.rigSlot);
    const egi = egiPresets.find(e => e.slot === event.egiSlot);
    const trip = trips.find(t => t.id === event.tripId);
    if (rig && egi) {
      const rigCombo = `${rig.sinkerDropLength}/${rig.branchLineLength}`;
      const egiCombo = `${egi.size}호 ${egi.color}`;
      const key = `${rigCombo}_${egiCombo}_${trip?.tideStage || 0}`;
      if (!performanceMap[key]) {
        performanceMap[key] = { count: 0, tideStage: trip?.tideStage, rigCombo, egiCombo };
      }
      performanceMap[key].count += 1;
    }
  });
  const topPerformers = Object.values(performanceMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  /* ── Time of day ── */
  const hourCounts: Record<number, number> = {};
  events.forEach(event => {
    const hour = new Date(event.at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const timeData = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: `${hour}시`, count, hourNum: parseInt(hour) }))
    .sort((a, b) => a.hourNum - b.hourNum);

  const peakHour = timeData.length > 0
    ? timeData.reduce((best, cur) => cur.count > best.count ? cur : best).hour
    : null;

  /* ── Monthly trend ── */
  const monthCounts: Record<string, number> = {};
  events.forEach(event => {
    const d = new Date(event.at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  });
  const monthlyData = Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const hasMonthlyTrend = monthlyData.length >= 2;

  /* ── Tide x Egi heatmap ── */
  type TideGroup = 'sari' | 'middle' | 'jogeum';
  const TIDE_GROUPS: TideGroup[] = ['sari', 'middle', 'jogeum'];
  const TIDE_GROUP_LABELS: Record<TideGroup, string> = {
    sari: '사리 (1-4)',
    middle: '중간 (5-10)',
    jogeum: '조금 (11-15)',
  };
  function tideGroupOf(stage?: number): TideGroup | null {
    if (stage == null) return null;
    if (stage >= 1 && stage <= 4) return 'sari';
    if (stage >= 5 && stage <= 10) return 'middle';
    if (stage >= 11 && stage <= 15) return 'jogeum';
    return null;
  }

  const uniqueEgiColors = Array.from(
    new Set(
      events
        .map(ev => egiPresets.find(e => e.slot === ev.egiSlot)?.color)
        .filter((c): c is string => !!c)
    )
  );

  const heatmapCounts: Record<string, Record<string, number>> = {};
  TIDE_GROUPS.forEach(g => { heatmapCounts[g] = {}; });

  events.forEach(ev => {
    const trip = trips.find(t => t.id === ev.tripId);
    const tg = tideGroupOf(trip?.tideStage);
    if (!tg) return;
    const egi = egiPresets.find(e => e.slot === ev.egiSlot);
    if (!egi?.color) return;
    heatmapCounts[tg][egi.color] = (heatmapCounts[tg][egi.color] || 0) + 1;
  });

  const maxHeatmapCount = Math.max(
    1,
    ...TIDE_GROUPS.flatMap(g => Object.values(heatmapCounts[g]))
  );
  const hasHeatmapData = uniqueEgiColors.length > 0 &&
    TIDE_GROUPS.some(g => Object.keys(heatmapCounts[g]).length > 0);

  /* ── Boat position analysis ── */
  const boatTrips = trips.filter(t => t.fishingType === 'boat');
  const boatPositionCounts: Record<string, { total: number; tripCount: number }> = {};

  boatTrips.forEach(trip => {
    if (!trip.boatPosition) return;
    const catchCount = events.filter(e => e.tripId === trip.id).length;
    if (!boatPositionCounts[trip.boatPosition]) {
      boatPositionCounts[trip.boatPosition] = { total: 0, tripCount: 0 };
    }
    boatPositionCounts[trip.boatPosition].total += catchCount;
    boatPositionCounts[trip.boatPosition].tripCount += 1;
  });

  const POSITION_LABELS: Record<string, string> = {
    bow: '뱃머리',
    middle: '중간',
    stern: '선미',
  };

  const boatPositionData = Object.entries(boatPositionCounts)
    .map(([pos, { total, tripCount }]) => ({
      position: POSITION_LABELS[pos] ?? pos,
      avg: tripCount > 0 ? parseFloat((total / tripCount).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.avg - a.avg);

  const hasBoatData = boatPositionData.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4">조과 분석</h1>

      <div className="space-y-6">
        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h2 className="font-semibold">최고 성과 조합</h2>
                <p className="text-sm text-muted-foreground">가장 많이 잡은 조합</p>
              </div>
            </div>
            <div className="space-y-3">
              {topPerformers.map((perf, idx) => (
                <div key={idx} className="bg-background p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg">{perf.count}수</span>
                    {perf.tideStage && (
                      <span className="text-sm text-muted-foreground">{perf.tideStage}물</span>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>단차: {perf.rigCombo}</div>
                    <div>에기: {perf.egiCombo}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Time of Day (improved with peak hour highlight) */}
        {timeData.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">시간대별 조과</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="조과수">
                  {timeData.map((entry) => (
                    <Cell
                      key={entry.hour}
                      fill={
                        entry.hour === peakHour
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--chart-4))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {peakHour && (
              <p className="mt-2 text-xs text-muted-foreground">
                * 최고 피크 시간대: <span className="font-semibold text-primary">{peakHour}</span>
              </p>
            )}
          </Card>
        )}

        {/* Monthly Trend */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">월별 트렌드</h2>
          </div>
          {hasMonthlyTrend ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="조과수"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              2개월 이상 데이터가 있어야 트렌드를 표시합니다
            </p>
          )}
        </Card>

        {/* Tide x Egi Heatmap */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Grid2x2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">물때 × 에기색상 교차분석</h2>
          </div>
          {hasHeatmapData ? (
            <ScrollArea className="w-full" type="scroll">
              <div className="min-w-[320px]">
                {/* Header row */}
                <div
                  className="grid gap-1 mb-1"
                  style={{ gridTemplateColumns: `120px repeat(${uniqueEgiColors.length}, 1fr)` }}
                >
                  <div />
                  {uniqueEgiColors.map((color) => (
                    <div
                      key={color}
                      className="text-center text-xs font-medium text-muted-foreground truncate px-1"
                    >
                      {color}
                    </div>
                  ))}
                </div>
                {/* Data rows */}
                {TIDE_GROUPS.map((tg) => (
                  <div
                    key={tg}
                    className="grid gap-1 mb-1"
                    style={{ gridTemplateColumns: `120px repeat(${uniqueEgiColors.length}, 1fr)` }}
                  >
                    <div className="text-xs font-medium text-muted-foreground flex items-center">
                      {TIDE_GROUP_LABELS[tg]}
                    </div>
                    {uniqueEgiColors.map((color) => {
                      const count = heatmapCounts[tg][color] ?? 0;
                      const opacity = count / maxHeatmapCount;
                      return (
                        <div
                          key={color}
                          title={`${TIDE_GROUP_LABELS[tg]} / ${color}: ${count}수`}
                          className="rounded flex items-center justify-center h-8 text-xs font-medium"
                          style={{
                            background: `hsl(var(--primary) / ${opacity})`,
                            color: opacity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              물때와 에기 색상 데이터가 있어야 표시됩니다
            </p>
          )}
        </Card>

        {/* Egi Combination Analysis */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">에기 조합별 히트율</h2>
          {egiComboData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={egiComboData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="combo"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" name="조과수" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          )}
          <div className="mt-4 text-xs text-muted-foreground">
            * 에기 사이즈 + 색상 조합별 총 조과수
          </div>
        </Card>

        {/* Rig Combination Analysis */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">단차 조합별 히트율</h2>
          {rigComboData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rigComboData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="combo"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="조과수" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          )}
          <div className="mt-4 text-xs text-muted-foreground">
            * 봉돌단차/가지줄단차 조합별 총 조과수
          </div>
        </Card>

        {/* Tide Stage Analysis */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">물때별 조과</h2>
          {tideData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tideData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" name="조과수" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          )}
        </Card>

        {/* Boat Position Analysis */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Anchor className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">선상 자리별 성공률</h2>
          </div>
          {hasBoatData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={boatPositionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="position" type="category" width={60} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val) => [`${val}수/회`, '평균 조과']} />
                <Bar dataKey="avg" fill="hsl(var(--chart-2))" name="평균 조과" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              선상 낚시 데이터가 없습니다
            </p>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            * 선상 출조 기준, 자리별 평균 조과수
          </div>
        </Card>

        {/* 수온 구간별 성공률 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Thermometer className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">수온 구간별 조과</h2>
          </div>
          {(() => {
            const ranges = [
              { label: '~14°C', min: -Infinity, max: 14 },
              { label: '14-16', min: 14, max: 16 },
              { label: '16-18', min: 16, max: 18 },
              { label: '18-20', min: 18, max: 20 },
              { label: '20-22', min: 20, max: 22 },
              { label: '22°C~', min: 22, max: Infinity },
            ];
            const tempMap = new Map<number, number>();
            conditions.forEach(c => { if (c.tripId && c.waterTemp != null) tempMap.set(c.tripId, c.waterTemp); });
            const data = ranges.map(r => {
              const count = events.filter(e => {
                const t = tempMap.get(e.tripId);
                return t != null && t >= r.min && t < r.max;
              }).length;
              return { range: r.label, count };
            });
            const hasData = data.some(d => d.count > 0);
            return hasData ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" name="조과수" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">수온 데이터가 없습니다</p>
            );
          })()}
        </Card>

        {/* 에기 타입별 성공률 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">에기 타입별 조과</h2>
          </div>
          {(() => {
            const TYPE_LABELS: Record<string, string> = { normal: '일반형', seu: '세우형', aji: '애자형' };
            const slotTypeMap = new Map(egiPresets.map(p => [p.slot, p.egiType]));
            const typeCounts: Record<string, number> = {};
            events.forEach(e => {
              const t = slotTypeMap.get(e.egiSlot);
              if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1;
            });
            const data = Object.entries(typeCounts).map(([type, count]) => ({
              type: TYPE_LABELS[type] ?? type,
              count,
            })).sort((a, b) => b.count - a.count);
            return data.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart layout="vertical" data={data}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" name="조과수" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">에기 타입 데이터가 없습니다</p>
            );
          })()}
        </Card>

        {/* 선사별 조획 통계 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">선사별 조과 통계</h2>
          </div>
          {(() => {
            const boatTrips = trips.filter(t => t.fishingType === 'boat' && t.boatCompany);
            const companyMap: Record<string, { total: number; count: number }> = {};
            boatTrips.forEach(trip => {
              const name = trip.boatCompany!;
              const catches = events.filter(e => e.tripId === trip.id).length;
              companyMap[name] ??= { total: 0, count: 0 };
              companyMap[name].total += catches;
              companyMap[name].count += 1;
            });
            const data = Object.entries(companyMap).map(([name, { total, count }]) => ({
              name,
              avg: count > 0 ? parseFloat((total / count).toFixed(1)) : 0,
              trips: count,
            })).sort((a, b) => b.avg - a.avg);
            return data.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
                <BarChart layout="vertical" data={data}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(val: number) => [`${val}수`, '평균 조과']} />
                  <Bar dataKey="avg" fill="hsl(var(--chart-1))" name="평균 조과" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">선상 출조 데이터가 없습니다</p>
            );
          })()}
        </Card>

        {/* Overall Statistics */}
        <Card className="p-4">
          <h2 className="font-semibold mb-2">전체 통계</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-2xl font-bold">{trips.length}</p>
              <p className="text-sm text-muted-foreground">총 출조 횟수</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-sm text-muted-foreground">총 조과</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {trips.length > 0 ? (events.length / trips.length).toFixed(1) : 0}
              </p>
              <p className="text-sm text-muted-foreground">평균 조과 / 출조</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {events.filter(e => e.kept).length}
              </p>
              <p className="text-sm text-muted-foreground">보관 수</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
