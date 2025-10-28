import { useLocationStore } from '@/stores/locationStore';
import { useTideStore } from '@/stores/tideStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export function TideCard() {
  const { lat, lng } = useLocationStore();
  const { stationName, highs, lows, isLoading, error, updatedAt, refresh } = useTideStore();

  const handleRefresh = () => {
    if (lat && lng) {
      refresh(lat, lng);
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    // timeStr format: "202510280100" -> "01:00"
    const hour = timeStr.slice(8, 10);
    const min = timeStr.slice(10, 12);
    return `${hour}:${min}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">해양 정보</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading || !lat || !lng}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
        
        {!lat || !lng ? (
          <p className="text-sm text-muted-foreground">지도에서 '내 위치'를 먼저 눌러주세요.</p>
        ) : error ? (
          <p className="text-sm text-destructive">조석 정보를 불러올 수 없습니다.</p>
        ) : stationName ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">관측소:</span>{' '}
              <span className="font-medium">{stationName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">만조:</span>{' '}
              <span className="font-medium">{formatTime(highs?.[0])}</span>
            </div>
            <div>
              <span className="text-muted-foreground">간조:</span>{' '}
              <span className="font-medium">{formatTime(lows?.[0])}</span>
            </div>
            {updatedAt && (
              <div className="text-xs text-muted-foreground">
                업데이트: {format(new Date(updatedAt), 'HH:mm')}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
