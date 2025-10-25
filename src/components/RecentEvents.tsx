import { Card } from '@/components/ui/card';
import { CatchEvent, RigPreset, EgiPreset } from '@/db/schema';

interface RecentEventsProps {
  events: CatchEvent[];
  rigPresets: RigPreset[];
  egiPresets: EgiPreset[];
}

export function RecentEvents({ events, rigPresets, egiPresets }: RecentEventsProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const getRigName = (slot: 'A' | 'B' | 'C') => {
    const preset = rigPresets.find(p => p.slot === slot);
    return preset?.name || `단차${slot}`;
  };

  const getEgiName = (slot: 'A' | 'B' | 'C') => {
    const preset = egiPresets.find(p => p.slot === slot);
    return preset?.name || `에기${slot}`;
  };

  if (events.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-2">최근 기록</h3>
        <p className="text-sm text-muted-foreground">아직 기록이 없습니다</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">최근 기록</h3>
      <div className="space-y-2">
        {events.slice(0, 3).map((event) => (
          <div key={event.id} className="text-sm flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <span className="font-medium">{formatTime(event.at)}</span>
              <span className="text-muted-foreground mx-2">·</span>
              <span>{getRigName(event.rigSlot)}</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span>{getEgiName(event.egiSlot)}</span>
            </div>
            <div className="font-medium">
              {event.sizeCm ? `${event.sizeCm}cm` : '1수'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
