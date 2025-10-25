import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV, importFromCSV, downloadCSV } from '@/lib/csv';
import { Download, Upload, Settings2 } from 'lucide-react';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    kma: '',
    khoa: '',
    openWeather: '',
  });
  const [apiEnabled, setApiEnabled] = useState({
    kma: false,
    khoa: false,
    openWeather: false,
  });
  const { toast } = useToast();

  const handleExportCSV = async () => {
    try {
      const csv = await exportToCSV();
      downloadCSV(csv, `fishing-log-${new Date().toISOString().split('T')[0]}.csv`);
      toast({
        title: 'CSV 내보내기 완료',
        description: '파일이 다운로드되었습니다',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: '내보내기 실패',
        variant: 'destructive',
      });
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importFromCSV(text);
      
      toast({
        title: 'CSV 불러오기 완료',
        description: `성공: ${result.success}, 실패: ${result.failed}`,
      });

      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: '불러오기 실패',
        variant: 'destructive',
      });
    }
  };

  const saveApiKey = (key: keyof typeof apiKeys) => {
    // TODO: Store in localStorage or settings table
    localStorage.setItem(`api_key_${key}`, apiKeys[key]);
    toast({
      title: 'API 키 저장 완료',
      description: `${key.toUpperCase()} API 키가 저장되었습니다`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Settings2 className="w-6 h-6" />
        설정
      </h1>

      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-4">데이터 가져오기/내보내기</h2>
          
          <div className="space-y-3">
            <Button onClick={handleExportCSV} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              CSV 내보내기
            </Button>

            <div>
              <label htmlFor="csv-import">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    CSV 불러오기
                  </span>
                </Button>
              </label>
              <input
                id="csv-import"
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-4">API 설정</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="kma-key">KMA API 키</Label>
                <Switch
                  checked={apiEnabled.kma}
                  onCheckedChange={(checked) => setApiEnabled({ ...apiEnabled, kma: checked })}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  id="kma-key"
                  type="password"
                  value={apiKeys.kma}
                  onChange={(e) => setApiKeys({ ...apiKeys, kma: e.target.value })}
                  placeholder="기상청 API 키"
                  disabled={!apiEnabled.kma}
                />
                <Button onClick={() => saveApiKey('kma')} disabled={!apiEnabled.kma}>
                  저장
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="khoa-key">KHOA API 키</Label>
                <Switch
                  checked={apiEnabled.khoa}
                  onCheckedChange={(checked) => setApiEnabled({ ...apiEnabled, khoa: checked })}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  id="khoa-key"
                  type="password"
                  value={apiKeys.khoa}
                  onChange={(e) => setApiKeys({ ...apiKeys, khoa: e.target.value })}
                  placeholder="해양조사원 API 키"
                  disabled={!apiEnabled.khoa}
                />
                <Button onClick={() => saveApiKey('khoa')} disabled={!apiEnabled.khoa}>
                  저장
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="openweather-key">OpenWeather API 키</Label>
                <Switch
                  checked={apiEnabled.openWeather}
                  onCheckedChange={(checked) => setApiEnabled({ ...apiEnabled, openWeather: checked })}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  id="openweather-key"
                  type="password"
                  value={apiKeys.openWeather}
                  onChange={(e) => setApiKeys({ ...apiKeys, openWeather: e.target.value })}
                  placeholder="OpenWeather API 키"
                  disabled={!apiEnabled.openWeather}
                />
                <Button onClick={() => saveApiKey('openWeather')} disabled={!apiEnabled.openWeather}>
                  저장
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            API 키를 설정하면 자동으로 날씨와 물때 정보를 가져옵니다.
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-2">앱 정보</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>버전: 1.0.0</p>
            <p>빌드: {new Date().toISOString().split('T')[0]}</p>
          </div>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => window.location.href = '/diagnostics'}
          >
            진단 페이지 열기
          </Button>
        </Card>
      </div>
    </div>
  );
}
