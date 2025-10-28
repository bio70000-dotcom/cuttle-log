import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWeatherStore } from '@/stores/weatherStore';
import { useLocationStore } from '@/stores/locationStore';

export function WeatherCard() {
  const { temperature, windSpeed, windDir, pop, updatedAt, isLoading, error } = useWeatherStore();
  const { lat, lng } = useLocationStore();
  const refresh = useWeatherStore((state) => state.refresh);

  const handleRefresh = () => {
    if (lat && lng) {
      refresh(lat, lng);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">현재 기상</CardTitle>
        {lat && lng && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        )}
        
        {!lat || !lng ? (
          <p className="text-sm text-muted-foreground">
            지도에서 '내 위치'를 먼저 눌러주세요.
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : temperature !== undefined ? (
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">기온:</span> {temperature.toFixed(1)} °C
            </p>
            <p className="text-sm">
              <span className="font-medium">강수확률:</span> {pop ?? 0} %
            </p>
            <p className="text-sm">
              <span className="font-medium">바람:</span> {windSpeed?.toFixed(1)} m/s (풍향 {windDir}°)
            </p>
            {updatedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                업데이트: {formatTime(updatedAt)}
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
