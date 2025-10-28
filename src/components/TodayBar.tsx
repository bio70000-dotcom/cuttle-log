import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Trip } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { MapPin, RefreshCw } from 'lucide-react';
import { useLocationStore } from '@/stores/locationStore';
import { reverseGeocode } from '@/lib/geocoding';
import { toast } from 'sonner';

interface TodayBarProps {
  currentTrip: Trip | null;
  onStartTrip: () => void;
  onEndTrip: () => void;
  onSelectSpot: () => void;
}

export function TodayBar({ currentTrip, onStartTrip, onEndTrip, onSelectSpot }: TodayBarProps) {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<'오프라인 저장 중' | '동기화 대기' | '동기화 완료'>('동기화 완료');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { lat, lng, placeName, setPlaceName } = useLocationStore();
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

  const handleRefreshPlaceName = async () => {
    if (!lat || !lng) return;
    
    setIsRefreshing(true);
    try {
      const newPlaceName = await reverseGeocode(lat, lng);
      if (newPlaceName) {
        setPlaceName(newPlaceName);
        toast.success('위치 정보를 갱신했습니다.');
      } else {
        toast.error('위치 정보를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('Refresh place name error:', error);
      toast.error('위치 정보 갱신에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
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
          className="flex-1 justify-start text-left"
        >
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {lat && lng ? (
              <>위치: {placeName || '지명 불명'} · {lat.toFixed(5)}, {lng.toFixed(5)}</>
            ) : (
              <span className="text-muted-foreground text-xs">지도에서 '내 위치'를 먼저 눌러주세요.</span>
            )}
          </span>
        </Button>
        
        {lat && lng && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshPlaceName}
            disabled={isRefreshing}
            className="flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
        
        {!currentTrip || currentTrip.dateEnd ? (
          <Button size="sm" onClick={onStartTrip} className="flex-shrink-0">
            출조 시작
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={onEndTrip} className="flex-shrink-0">
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
