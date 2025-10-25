import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Trip } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { MapPin, RefreshCw } from 'lucide-react';

interface TodayBarProps {
  currentTrip: Trip | null;
  onStartTrip: () => void;
  onEndTrip: () => void;
  onSelectSpot: () => void;
}

export function TodayBar({ currentTrip, onStartTrip, onEndTrip, onSelectSpot }: TodayBarProps) {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<'오프라인 저장 중' | '동기화 대기' | '동기화 완료'>('동기화 완료');
  
  const outboxCount = useLiveQuery(() => db.outbox.count());

  useEffect(() => {
    if (!isOnline) {
      setSyncStatus('오프라인 저장 중');
    } else if (outboxCount && outboxCount > 0) {
      setSyncStatus('동기화 대기');
    } else {
      setSyncStatus('동기화 완료');
    }
  }, [isOnline, outboxCount]);

  const getTripStatus = () => {
    if (!currentTrip) return '출조 전';
    if (currentTrip.dateEnd) return '종료';
    return '출조 중';
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={currentTrip && !currentTrip.dateEnd ? 'default' : 'secondary'}>
            {getTripStatus()}
          </Badge>
          {currentTrip && !currentTrip.dateEnd && (
            <span className="text-sm text-muted-foreground">
              {formatTime(currentTrip.dateStart)}
            </span>
          )}
        </div>
        
        <Badge variant={syncStatus === '동기화 완료' ? 'default' : 'outline'}>
          {syncStatus}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectSpot}
          className="flex-1"
        >
          <MapPin className="w-4 h-4 mr-2" />
          {currentTrip?.spotName || '위치 선택'}
        </Button>
        
        {!currentTrip || currentTrip.dateEnd ? (
          <Button size="sm" onClick={onStartTrip}>
            출조 시작
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={onEndTrip}>
            종료
          </Button>
        )}
      </div>

      {currentTrip && (
        <div className="text-sm text-muted-foreground flex items-center justify-between">
          <span>물때: {currentTrip.tideStage || '-'}물</span>
          {currentTrip.tideHighTimes && currentTrip.tideHighTimes.length > 0 && (
            <span>만조: {currentTrip.tideHighTimes.join(', ')}</span>
          )}
        </div>
      )}
    </div>
  );
}
