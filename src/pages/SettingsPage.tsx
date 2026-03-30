import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV, importFromCSV, downloadCSV } from '@/lib/csv'
import { Download, Upload, Settings2, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { fullSync, getLastSyncAt } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useEffect } from 'react'

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    kma: '',
    khoa: '',
    openWeather: '',
    vworld: '',
  })
  const [apiEnabled, setApiEnabled] = useState({
    kma: false,
    khoa: false,
    openWeather: false,
    vworld: false,
  })
  const [mapSettings, setMapSettings] = useState({
    khoaOverlay: true,
    offlineCache: true,
  })
  const { toast } = useToast()

  // Auth state
  const { user, isLoading: authLoading, error: authError, signIn, signUp, signOut, clearError } = useAuthStore()
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const supabaseEnabled = isSupabaseConfigured()

  useEffect(() => {
    getLastSyncAt().then(setLastSyncTime).catch(() => {})
  }, [])

  const handleSignIn = async () => {
    clearError()
    await signIn(authEmail, authPassword)
  }

  const handleSignUp = async () => {
    clearError()
    await signUp(authEmail, authPassword)
    toast({ title: '회원가입 완료', description: '이메일을 확인해 주세요' })
  }

  const handleSignOut = async () => {
    await signOut()
    toast({ title: '로그아웃 완료' })
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const result = await fullSync()
      const now = new Date()
      setLastSyncTime(now)
      toast({
        title: '동기화 완료',
        description: `업로드 ${result.synced}건${result.failed > 0 ? `, 실패 ${result.failed}건` : ''}`,
      })
    } catch (err) {
      toast({
        title: '동기화 실패',
        description: err instanceof Error ? err.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const csv = await exportToCSV()
      downloadCSV(csv, `fishing-log-${new Date().toISOString().split('T')[0]}.csv`)
      toast({
        title: 'CSV 내보내기 완료',
        description: '파일이 다운로드되었습니다',
      })
    } catch (error) {
      toast({
        title: '내보내기 실패',
        variant: 'destructive',
      })
    }
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const result = await importFromCSV(text)

      toast({
        title: 'CSV 불러오기 완료',
        description: `성공: ${result.success}, 실패: ${result.failed}`,
      })

      event.target.value = ''
    } catch {
      toast({
        title: '불러오기 실패',
        variant: 'destructive',
      })
    }
  }

  const saveApiKey = (key: keyof typeof apiKeys) => {
    localStorage.setItem(`api_key_${key}`, apiKeys[key])
    toast({
      title: 'API 키 저장 완료',
      description: `${key.toUpperCase()} API 키가 저장되었습니다`,
    })
  }

  const saveMapSettings = () => {
    localStorage.setItem('map_khoa_overlay', String(mapSettings.khoaOverlay))
    localStorage.setItem('map_offline_cache', String(mapSettings.offlineCache))
    toast({
      title: '지도 설정 저장 완료',
    })
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Settings2 className="w-6 h-6" />
        설정
      </h1>

      <div className="space-y-4">
        {/* Cloud Sync Section */}
        {supabaseEnabled && (
          <Card className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              {user ? (
                <Cloud className="w-4 h-4 text-primary" />
              ) : (
                <CloudOff className="w-4 h-4 text-muted-foreground" />
              )}
              클라우드 동기화
            </h2>

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  로그인하면 여러 기기에서 낚시 기록을 동기화할 수 있습니다.
                </p>
                <div>
                  <Label htmlFor="auth-email">이메일</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="auth-password">비밀번호</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="8자 이상"
                    className="mt-1"
                  />
                </div>
                {authError && (
                  <p className="text-sm text-destructive">{authError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSignIn}
                    disabled={authLoading || !authEmail || !authPassword}
                    className="flex-1"
                  >
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '로그인'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignUp}
                    disabled={authLoading || !authEmail || !authPassword}
                    className="flex-1"
                  >
                    회원가입
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="text-sm font-medium">{user.email}</p>
                </div>

                {lastSyncTime && (
                  <p className="text-xs text-muted-foreground">
                    마지막 동기화: {lastSyncTime.toLocaleString('ko-KR')}
                  </p>
                )}
                {!lastSyncTime && (
                  <p className="text-xs text-muted-foreground">아직 동기화하지 않았습니다</p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="flex-1"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {isSyncing ? '동기화 중...' : '지금 동기화'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    disabled={authLoading}
                  >
                    로그아웃
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

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
          <h2 className="font-semibold mb-4">지도 설정</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="vworld-key">VWorld API 키</Label>
                <Switch
                  checked={apiEnabled.vworld}
                  onCheckedChange={(checked) => setApiEnabled({ ...apiEnabled, vworld: checked })}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  id="vworld-key"
                  type="password"
                  value={apiKeys.vworld}
                  onChange={(e) => setApiKeys({ ...apiKeys, vworld: e.target.value })}
                  placeholder="VWorld API 키"
                  disabled={!apiEnabled.vworld}
                />
                <Button onClick={() => saveApiKey('vworld')} disabled={!apiEnabled.vworld}>
                  저장
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                VWorld 키를 입력하면 국내 최적화 지도와 위성 지도를 사용할 수 있습니다.
                <br />
                <a
                  href="https://www.vworld.kr/dev/v4dv_2ddataguide2_s001.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  VWorld 키 발급 받기 →
                </a>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>KHOA 해양 정보 표시</Label>
                <Switch
                  checked={mapSettings.khoaOverlay}
                  onCheckedChange={(checked) => setMapSettings({ ...mapSettings, khoaOverlay: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                해안선, 해양 정보 오버레이를 표시합니다
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>오프라인 타일 캐시</Label>
                <Switch
                  checked={mapSettings.offlineCache}
                  onCheckedChange={(checked) => setMapSettings({ ...mapSettings, offlineCache: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                지도 타일을 캐시하여 오프라인에서도 사용 가능하게 합니다
              </p>
            </div>

            <Button onClick={saveMapSettings} variant="outline" className="w-full">
              지도 설정 저장
            </Button>
          </div>
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
  )
}
