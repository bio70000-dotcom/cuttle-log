import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/use-toast';
import { Copy, Activity } from 'lucide-react';

export default function DiagnosticsPage() {
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  
  const tripCount = useLiveQuery(() => db.trips.count(), []);
  const conditionCount = useLiveQuery(() => db.conditions.count(), []);
  const rigPresetCount = useLiveQuery(() => db.rigPresets.count(), []);
  const egiPresetCount = useLiveQuery(() => db.egiPresets.count(), []);
  const catchEventCount = useLiveQuery(() => db.catchEvents.count(), []);
  const outboxCount = useLiveQuery(() => db.outbox.count(), []);

  const recentSync = useLiveQuery(
    () => db.outbox.orderBy('createdAt').reverse().limit(10).toArray(),
    []
  ) || [];

  const diagnosticText = `
=== Lovable Cuttle Log 진단 정보 ===
앱 버전: 1.0.0
빌드 시간: ${new Date().toISOString()}
온라인 상태: ${isOnline ? '온라인' : '오프라인'}

=== IndexedDB 테이블 개수 ===
Trips: ${tripCount || 0}
Conditions: ${conditionCount || 0}
Rig Presets: ${rigPresetCount || 0}
Egi Presets: ${egiPresetCount || 0}
Catch Events: ${catchEventCount || 0}
Outbox (동기화 대기): ${outboxCount || 0}

=== 최근 동기화 시도 (최대 10개) ===
${recentSync.map((item, idx) => `
${idx + 1}. ${item.entityType}
   생성: ${new Date(item.createdAt).toISOString()}
   시도 횟수: ${item.tryCount}
   ${item.lastError ? `오류: ${item.lastError}` : '대기 중'}
`).join('')}

=== 브라우저 정보 ===
User Agent: ${navigator.userAgent}
언어: ${navigator.language}
Platform: ${navigator.platform}
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticText);
      toast({
        title: '진단 정보 복사 완료',
        description: '클립보드에 복사되었습니다',
      });
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '수동으로 선택하여 복사해주세요',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          진단
        </h1>
        <Button onClick={handleCopy} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          복사
        </Button>
      </div>

      <Card className="p-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">앱 버전</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">빌드 시간</span>
            <span className="font-medium">{new Date().toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">온라인 상태</span>
            <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? '온라인' : '오프라인'}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="font-semibold mb-3">IndexedDB 테이블</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trips</span>
            <span className="font-medium">{tripCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Conditions</span>
            <span className="font-medium">{conditionCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rig Presets</span>
            <span className="font-medium">{rigPresetCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Egi Presets</span>
            <span className="font-medium">{egiPresetCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Catch Events</span>
            <span className="font-medium">{catchEventCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Outbox (동기화 대기)</span>
            <span className="font-medium">{outboxCount || 0}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">최근 동기화 시도</h2>
        {recentSync.length > 0 ? (
          <div className="space-y-3">
            {recentSync.map((item) => (
              <div key={item.id} className="text-sm border-b last:border-0 pb-2">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{item.entityType}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  시도 {item.tryCount}회
                  {item.lastError && <span className="text-destructive ml-2">{item.lastError}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">동기화 기록 없음</p>
        )}
      </Card>
    </div>
  );
}
