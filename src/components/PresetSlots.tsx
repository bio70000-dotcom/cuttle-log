import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RigPreset, EgiPreset } from '@/db/schema';

interface PresetSlotsProps {
  rigPresets: RigPreset[];
  egiPresets: EgiPreset[];
  activeRigSlot: 'A' | 'B' | 'C';
  activeEgiSlot: 'A' | 'B' | 'C';
  onRigSlotChange: (slot: 'A' | 'B' | 'C') => void;
  onEgiSlotChange: (slot: 'A' | 'B' | 'C') => void;
}

export function PresetSlots({
  rigPresets,
  egiPresets,
  activeRigSlot,
  activeEgiSlot,
  onRigSlotChange,
  onEgiSlotChange,
}: PresetSlotsProps) {
  const getRigPreset = (slot: 'A' | 'B' | 'C') => rigPresets.find(p => p.slot === slot);
  const getEgiPreset = (slot: 'A' | 'B' | 'C') => egiPresets.find(p => p.slot === slot);

  const activeRig = getRigPreset(activeRigSlot);
  const activeEgi = getEgiPreset(activeEgiSlot);

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">단차 프리셋</h3>
        <div className="flex gap-2">
          {(['A', 'B', 'C'] as const).map(slot => {
            const preset = getRigPreset(slot);
            return (
              <Button
                key={slot}
                variant={activeRigSlot === slot ? 'default' : 'outline'}
                size="sm"
                onClick={() => onRigSlotChange(slot)}
                className="flex-1"
              >
                {slot}
                {preset && (
                  <span className="ml-1 text-xs opacity-70">
                    {preset.totalLenCm}cm
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        {activeRig && (
          <p className="text-xs text-muted-foreground mt-2">
            {activeRig.name} - 전장 {activeRig.totalLenCm}cm, 가지 {activeRig.branchLenCm}cm, 봉돌 {activeRig.sinkerNo}호
          </p>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-2">에기 프리셋</h3>
        <div className="flex gap-2">
          {(['A', 'B', 'C'] as const).map(slot => {
            const preset = getEgiPreset(slot);
            return (
              <Button
                key={slot}
                variant={activeEgiSlot === slot ? 'default' : 'outline'}
                size="sm"
                onClick={() => onEgiSlotChange(slot)}
                className="flex-1"
              >
                {slot}
                {preset && (
                  <span className="ml-1 text-xs opacity-70">
                    {preset.size}호
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        {activeEgi && (
          <p className="text-xs text-muted-foreground mt-2">
            {activeEgi.name} - {activeEgi.size}호, {activeEgi.color}, {activeEgi.finish}
          </p>
        )}
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm">
          <span className="font-medium">현재:</span> 단차 {activeRigSlot} · 에기 {activeEgiSlot}
        </p>
      </div>
    </Card>
  );
}
