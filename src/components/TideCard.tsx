import { useLocationStore } from '@/stores/locationStore';
import { useMarineBundleStore } from '@/stores/marineBundleStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export function TideCard() {
  const { lat, lng } = useLocationStore();
  const { data, isLoading, error, refresh } = useMarineBundleStore();

  const handleRefresh = () => {
    if (lat && lng) {
      refresh(lat, lng);
    }
  };

  const formatTimeLevel = (item?: { time: string; level: number }) => {
    if (!item) return '-';
    const localTime = format(new Date(item.time), 'HH:mm');
    return `${localTime} · ${item.level.toFixed(0)} cm`;
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
          <p className="text-sm text-destructive">{error}</p>
        ) : data ? (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">관측소:</span>{' '}
              <span className="font-medium">{data.stationName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">만조:</span>{' '}
              <span className="font-medium">{formatTimeLevel(data.tides.high)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">간조:</span>{' '}
              <span className="font-medium">{formatTimeLevel(data.tides.low)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">조차:</span>{' '}
              <span className="font-medium">
                {data.tides.range != null ? `${data.tides.range.toFixed(0)} cm` : '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">해수온:</span>{' '}
              <span className="font-medium">
                {data.sst != null ? `${data.sst.toFixed(1)} °C` : '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">물흐름:</span>{' '}
              <span className="font-medium">
                {data.tides.progressPct != null ? `${data.tides.progressPct} %` : '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">물때:</span>{' '}
              <span className="font-medium">{data.mulTtae ?? '-'}</span>
            </div>
            {data.updatedAt && (
              <div className="text-xs text-muted-foreground">
                업데이트: {format(new Date(data.updatedAt), 'HH:mm')}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
