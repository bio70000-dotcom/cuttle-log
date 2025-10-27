import { Card } from '@/components/ui/card';
import { CatchEvent, RigPreset, EgiPreset } from '@/db/schema';
import { format } from 'date-fns';

interface RecentEventsProps {
  events: CatchEvent[];
  rigPresets: RigPreset[];
  egiPresets: EgiPreset[];
}

export function RecentEvents({ events, rigPresets, egiPresets }: RecentEventsProps) {
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
      <div className="space-y-3">
        {events.map((event) => {
          const rig = rigPresets.find(r => r.slot === event.rigSlot);
          const egi = egiPresets.find(e => e.slot === event.egiSlot);
          
          return (
            <div key={event.id} className="pb-3 border-b last:border-0">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">
                  {format(new Date(event.at), 'HH:mm')}
                </div>
                <div className="text-sm font-semibold">
                  {event.sizeCm ? `${event.sizeCm}cm` : '1수'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                단차{event.rigSlot} ({rig?.sinkerDropLength || '?'}/{rig?.branchLineLength || '?'})
                {' · '}
                에기{event.egiSlot} ({egi?.size || '?'} {egi?.color || ''})
              </div>
              {event.kept !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  {event.kept ? '보관' : '방생'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
