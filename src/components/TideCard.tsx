import { useLocationStore } from '@/stores/locationStore';
import { useMarineBundleStore } from '@/stores/marineBundleStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { REGION_NAMES, type RegionKey } from '@/config/regions';

export function TideCard() {
  const { lat, lng } = useLocationStore();
  const { data, isLoading, error, refresh } = useMarineBundleStore();
  const { regionMode, regionManual, setAuto, setManual } = useSettingsStore();

  const handleRefresh = () => {
    if (lat && lng) {
      refresh(lat, lng);
    }
  };

  const handleRegionChange = (value: string) => {
    if (value === 'AUTO') {
      setAuto();
    } else {
      setManual(value as RegionKey);
    }
    // Refresh data with new region
    if (lat && lng) {
      setTimeout(() => refresh(lat, lng), 100);
    }
  };

  const formatTimeLevel = (item: { time: string; level: number }, prevLevel?: number) => {
    const localTime = format(new Date(item.time), 'HH:mm');
    const level = item.level.toFixed(0);
    
    if (prevLevel !== undefined) {
      const diff = item.level - prevLevel;
      const arrow = diff > 0 ? '▲' : '▼';
      const sign = diff > 0 ? '+' : '';
      return `${localTime} (${level}) ${arrow}${sign}${diff.toFixed(0)}`;
    }
    
    return `${localTime} (${level})`;
  };

  const currentRegionValue = regionMode === 'AUTO' ? 'AUTO' : regionManual || 'AUTO';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">해양 정보</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={currentRegionValue} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">자동(GPS)</SelectItem>
              <SelectItem value="WEST">서해</SelectItem>
              <SelectItem value="SOUTH">남해</SelectItem>
              <SelectItem value="EAST">동해</SelectItem>
              <SelectItem value="JEJU">제주</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || !lat || !lng}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
        
        {!lat || !lng ? (
          <p className="text-sm text-muted-foreground">지도에서 '내 위치'를 먼저 눌러주세요.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : data ? (
          <>
            {/* 물때, 물흐름 - 상단에 크게 표시 */}
            <div className="flex items-center justify-between mb-4 p-3 bg-primary/5 rounded-lg">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">물때</div>
                <div className="text-2xl font-bold">
                  {data.mulTtae !== undefined && data.mulTtae !== null && data.mulTtae !== '' ? data.mulTtae : '-'}
                </div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-xs text-muted-foreground mb-1">물흐름</div>
                <div className="text-2xl font-bold">
                  {data.tides.progressPct !== undefined && data.tides.progressPct !== null 
                    ? `${data.tides.progressPct}%` 
                    : (data.stageForecast?.[0]?.flowPct !== undefined && data.stageForecast[0].flowPct !== null
                        ? `${data.stageForecast[0].flowPct}%`
                        : '-'
                      )
                  }
                </div>
              </div>
            </div>

            {/* 관측소, 지역, 조차, 해수온 */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">관측소:</span>
                <span className="ml-2 font-medium">{data.stationName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">지역:</span>
                <span className="ml-2 font-medium">{REGION_NAMES[data.region]}</span>
              </div>
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
            </div>

            {/* 간조 목록 */}
            {data.tides.lows.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-2">간조</div>
                <div className="space-y-1">
                  {data.tides.lows.map((low, idx) => {
                    const prevHigh = data.tides.highs.find(h => new Date(h.time) < new Date(low.time));
                    return (
                      <div key={low.time} className="text-sm font-mono bg-blue-500/10 px-2 py-1 rounded">
                        {formatTimeLevel(low, prevHigh?.level)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 만조 목록 */}
            {data.tides.highs.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-2">만조</div>
                <div className="space-y-1">
                  {data.tides.highs.map((high, idx) => {
                    const prevLow = [...data.tides.lows].reverse().find(l => new Date(l.time) < new Date(high.time));
                    return (
                      <div key={high.time} className="text-sm font-mono bg-red-500/10 px-2 py-1 rounded">
                        {formatTimeLevel(high, prevLow?.level)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
