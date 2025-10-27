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

  // Group by rig slot and egi slot combo
  const comboCounts: Record<string, { count: number; rigSlot: string; egiSlot: string }> = {};
  
  events.forEach(event => {
    const key = `${event.rigSlot}-${event.egiSlot}`;
    if (!comboCounts[key]) {
      comboCounts[key] = { count: 0, rigSlot: event.rigSlot, egiSlot: event.egiSlot };
    }
    comboCounts[key].count += 1;
  });

  const topCombos = Object.values(comboCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);
  
  if (topCombos.length === 0) return null;

  return (
    <Card className="p-4 bg-accent/50">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold mb-2">비슷한 조건에서 잘 먹힌 조합</h3>
          <div className="space-y-2">
            {topCombos.map((combo, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-medium">
                  단차{combo.rigSlot} · 에기{combo.egiSlot}
                </span>
                <span className="text-muted-foreground ml-2">
                  {combo.count}수 기록
                </span>
              </div>
            ))}
          </div>
          {currentTideStage && (
            <p className="text-xs text-muted-foreground mt-3">
              현재 {currentTideStage}물때 조건
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
