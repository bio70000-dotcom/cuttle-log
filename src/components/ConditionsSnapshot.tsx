import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Edit } from 'lucide-react';
import { ConditionSnapshot } from '@/db/schema';

interface ConditionsSnapshotProps {
  condition: ConditionSnapshot | null;
  lastFetched?: Date;
  onRefresh: () => void;
  onEdit: () => void;
}

export function ConditionsSnapshot({ condition, lastFetched, onRefresh, onEdit }: ConditionsSnapshotProps) {
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">현재 조건</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {condition ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">수온</span>
            <p className="font-medium">{condition.waterTemp ? `${condition.waterTemp}°C` : '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">파고</span>
            <p className="font-medium">{condition.waveHeight ? `${condition.waveHeight}m` : '-'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">풍향/풍속</span>
            <p className="font-medium">
              {condition.windDir || '-'} {condition.windSpeed ? `${condition.windSpeed}m/s` : ''}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">구름</span>
            <p className="font-medium">{condition.clouds ? `${condition.clouds}%` : '-'}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">조건 정보 없음</p>
      )}

      {lastFetched && (
        <p className="text-xs text-muted-foreground mt-3">
          자동 갱신 {formatTime(lastFetched)}
        </p>
      )}
    </Card>
  );
}
