import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const events = useLiveQuery(() => db.catchEvents.toArray(), []) || [];
  const trips = useLiveQuery(() => db.trips.toArray(), []) || [];

  // Analyze by tide stage
  const byTideStage = trips.reduce((acc, trip) => {
    if (!trip.tideStage) return acc;
    const count = events.filter(e => e.tripId === trip.id).length;
    acc[trip.tideStage] = (acc[trip.tideStage] || 0) + count;
    return acc;
  }, {} as Record<number, number>);

  const tideData = Object.entries(byTideStage).map(([stage, count]) => ({
    stage: `${stage}물`,
    count,
  }));

  // Analyze by rig slot
  const byRigSlot = events.reduce((acc, event) => {
    acc[event.rigSlot] = (acc[event.rigSlot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rigData = Object.entries(byRigSlot).map(([slot, count]) => ({
    slot: `단차${slot}`,
    count,
  }));

  // Analyze by egi slot
  const byEgiSlot = events.reduce((acc, event) => {
    acc[event.egiSlot] = (acc[event.egiSlot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const egiData = Object.entries(byEgiSlot).map(([slot, count]) => ({
    slot: `에기${slot}`,
    count,
  }));

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4">분석</h1>

      <div className="space-y-6">
        <Card className="p-4">
          <h2 className="font-semibold mb-4">물때별 조과</h2>
          {tideData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tideData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-4">단차별 조과</h2>
          {rigData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rigData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="slot" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-4">에기별 조과</h2>
          {egiData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={egiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="slot" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">데이터 없음</p>
          )}
        </Card>

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
