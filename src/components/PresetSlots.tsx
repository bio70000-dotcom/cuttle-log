import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RigPreset, EgiPreset } from '@/db/schema';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const getRigPreset = (slot: 'A' | 'B' | 'C') => {
    return rigPresets.find(p => p.slot === slot);
  };

  const getEgiPreset = (slot: 'A' | 'B' | 'C') => {
    return egiPresets.find(p => p.slot === slot);
  };

  const activeRig = getRigPreset(activeRigSlot);
  const activeEgi = getEgiPreset(activeEgiSlot);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">단차/에기 프리셋</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/presets')}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Rig Presets */}
      <div className="mb-4">
        <div className="text-sm text-muted-foreground mb-2">단차 프리셋</div>
        <div className="flex gap-2 mb-3">
          {(['A', 'B', 'C'] as const).map(slot => {
            const preset = getRigPreset(slot);
            return (
              <Button
                key={slot}
                variant={activeRigSlot === slot ? 'default' : 'outline'}
                size="sm"
                className="flex-1 flex flex-col h-auto py-2"
                onClick={() => onRigSlotChange(slot)}
              >
                <span className="font-bold">{slot}</span>
                {preset && (
                  <span className="text-xs mt-1 opacity-90">
                    {preset.sinkerDropLength || '미설정'}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        
        {activeRig && (
          <div className="bg-accent/50 p-3 rounded-lg text-sm">
            <div className="font-medium mb-1">{activeRig.name || `단차 ${activeRigSlot}`}</div>
            <div className="text-muted-foreground space-y-1">
              <div>봉돌단차: {activeRig.sinkerDropLength || '미설정'}</div>
              <div>가지줄단차: {activeRig.branchLineLength || '미설정'}</div>
              {activeRig.notes && <div className="text-xs mt-2">{activeRig.notes}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Egi Presets */}
      <div>
        <div className="text-sm text-muted-foreground mb-2">에기 프리셋</div>
        <div className="flex gap-2 mb-3">
          {(['A', 'B', 'C'] as const).map(slot => {
            const preset = getEgiPreset(slot);
            return (
              <Button
                key={slot}
                variant={activeEgiSlot === slot ? 'default' : 'outline'}
                size="sm"
                className="flex-1 flex flex-col h-auto py-2"
                onClick={() => onEgiSlotChange(slot)}
              >
                <span className="font-bold">{slot}</span>
                {preset && (
                  <span className="text-xs mt-1 opacity-90">
                    {preset.size || '미설정'}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        
        {activeEgi && (
          <div className="bg-accent/50 p-3 rounded-lg text-sm">
            <div className="font-medium mb-1">{activeEgi.name || `에기 ${activeEgiSlot}`}</div>
            <div className="text-muted-foreground space-y-1">
              <div>사이즈: {activeEgi.size || '미설정'}</div>
              <div>색상: {activeEgi.color || '미설정'}</div>
              <div>마감: {activeEgi.finish || '미설정'}</div>
              {activeEgi.notes && <div className="text-xs mt-2">{activeEgi.notes}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Current Selection Summary */}
      <div className="mt-4 pt-4 border-t text-center text-sm">
        <span className="text-muted-foreground">현재 조합: </span>
        <span className="font-semibold">
          단차{activeRigSlot} ({activeRig?.sinkerDropLength || '?'}/{activeRig?.branchLineLength || '?'})
          {' · '}
          에기{activeEgiSlot} ({activeEgi?.size || '?'} {activeEgi?.color || ''})
        </span>
      </div>
    </Card>
  );
}
