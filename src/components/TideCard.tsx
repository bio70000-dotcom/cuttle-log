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
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
        
        {!lat || !lng ? (
          <p className="text-sm text-muted-foreground">지도에서 '내 위치'를 먼저 눌러주세요.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">관측소:</span>
                <span className="ml-2 font-medium">{data.stationName}</span>
              </div>
              {data.tides.high && (
                <div>
                  <span className="text-muted-foreground">만조:</span>
                  <span className="ml-2 font-medium">{formatTimeLevel(data.tides.high)}</span>
                </div>
              )}
              {data.tides.low && (
                <div>
                  <span className="text-muted-foreground">간조:</span>
                  <span className="ml-2 font-medium">{formatTimeLevel(data.tides.low)}</span>
                </div>
              )}
              {data.tides.range != null && (
                <div>
                  <span className="text-muted-foreground">조차:</span>
                  <span className="ml-2 font-medium">{data.tides.range.toFixed(0)} cm</span>
                </div>
              )}
              {data.sst != null && (
                <div>
                  <span className="text-muted-foreground">해수온:</span>
                  <span className="ml-2 font-medium">{data.sst.toFixed(1)} °C</span>
                </div>
              )}
              {data.tides.progressPct != null && (
                <div>
                  <span className="text-muted-foreground">물흐름:</span>
                  <span className="ml-2 font-medium">{data.tides.progressPct} %</span>
                </div>
              )}
              {data.mulTtae && (
                <div>
                  <span className="text-muted-foreground">물때:</span>
                  <span className="ml-2 font-medium">{data.mulTtae}</span>
                </div>
              )}
            </div>

            {data.stageForecast && data.stageForecast.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">물때/물흐름 (7일)</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {data.stageForecast.map((day, idx) => {
                    const date = new Date(day.date);
                    const isToday = idx === 0;
                    return (
                      <div
                        key={day.date}
                        className={`flex-shrink-0 rounded-lg border px-3 py-2 min-w-[80px] ${
                          isToday ? 'bg-primary/10 border-primary/30' : 'bg-card'
                        }`}
                      >
                        <div className="text-xs font-medium">
                          {isToday ? '오늘' : `${date.getMonth() + 1}/${date.getDate()}`}
                        </div>
                        <div className="text-sm font-semibold mt-1">{day.stage}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {day.flowPct != null ? `${day.flowPct}%` : '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              업데이트: {format(new Date(data.updatedAt), 'HH:mm')}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
