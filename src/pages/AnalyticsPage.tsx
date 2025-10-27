import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Lightbulb, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const events = useLiveQuery(() => db.catchEvents.toArray(), []) || [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) || [];
  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) || [];
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) || [];
  const conditions = useLiveQuery(() => db.conditions.toArray(), []) || [];

  // Analyze by rig combination (sinker + branch)
  const rigComboCounts: Record<string, number> = {};
  events.forEach(event => {
    const rig = rigPresets.find(r => r.slot === event.rigSlot);
    if (rig) {
      const key = `${rig.sinkerDropLength || '?'}/${rig.branchLineLength || '?'}`;
      rigComboCounts[key] = (rigComboCounts[key] || 0) + 1;
    }
  });

  const rigComboData = Object.entries(rigComboCounts)
    .map(([combo, count]) => ({
      combo,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Analyze by egi combination (size + color)
  const egiComboCounts: Record<string, number> = {};
  events.forEach(event => {
    const egi = egiPresets.find(e => e.slot === event.egiSlot);
    if (egi) {
      const key = `${egi.size || '?'}호 ${egi.color || '?'}`;
      egiComboCounts[key] = (egiComboCounts[key] || 0) + 1;
    }
  });

  const egiComboData = Object.entries(egiComboCounts)
    .map(([combo, count]) => ({
      combo,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Analyze by tide stage
  const byTideStage = trips.reduce((acc, trip) => {
    if (!trip.tideStage) return acc;
    const count = events.filter(e => e.tripId === trip.id).length;
    acc[trip.tideStage] = (acc[trip.tideStage] || 0) + count;
    return acc;
  }, {} as Record<number, number>);

  const tideData = Object.entries(byTideStage)
    .map(([stage, count]) => ({
      stage: `${stage}물`,
      count,
    }))
    .sort((a, b) => parseInt(a.stage) - parseInt(b.stage));

  // Best performing combination with conditions
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
        performanceMap[key] = {
          count: 0,
          tideStage: trip?.tideStage,
          rigCombo,
          egiCombo,
        };
      }
      performanceMap[key].count += 1;
    }
  });

  const topPerformers = Object.values(performanceMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Time-based analysis (hour of day)
  const hourCounts: Record<number, number> = {};
  events.forEach(event => {
    const hour = new Date(event.at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const timeData = Object.entries(hourCounts)
    .map(([hour, count]) => ({
      hour: `${hour}시`,
      count,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4">조과 분석</h1>

      <div className="space-y-6">
        {/* Top Performers Card */}
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

        {/* Time of Day Analysis */}
        {timeData.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4">시간대별 조과</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" name="조과수" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

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
