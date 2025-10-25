import { Card } from '@/components/ui/card';
import { CatchEvent, ConditionSnapshot } from '@/db/schema';
import { Lightbulb } from 'lucide-react';

interface MiniInsightProps {
  events: CatchEvent[];
  conditions: ConditionSnapshot[];
  currentTideStage?: number;
}

export function MiniInsight({ events, conditions, currentTideStage }: MiniInsightProps) {
  if (events.length === 0) {
    return null;
  }

  // Simple analysis: most successful rig/egi combo
  const comboCounts: Record<string, number> = {};
  events.forEach(event => {
    const key = `${event.rigSlot}-${event.egiSlot}`;
    comboCounts[key] = (comboCounts[key] || 0) + 1;
  });

  const topCombo = Object.entries(comboCounts).sort((a, b) => b[1] - a[1])[0];
  
  if (!topCombo) return null;

  const [rigSlot, egiSlot] = topCombo[0].split('-');
  const count = topCombo[1];

  return (
    <Card className="p-4 bg-accent/50">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-semibold mb-1">비슷한 조건에서 잘 먹힌 조합</h3>
          <p className="text-sm text-muted-foreground">
            단차{rigSlot} · 에기{egiSlot} 조합으로 {count}수 기록
          </p>
          {currentTideStage && (
            <p className="text-xs text-muted-foreground mt-1">
              현재 {currentTideStage}물때와 유사한 조건
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
