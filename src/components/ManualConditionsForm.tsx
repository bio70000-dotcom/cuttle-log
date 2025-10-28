import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ManualConditionsFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    waterTemp?: number;
    depth?: number;
    currentStrength?: string;
    waterColor?: string;
  }) => void;
}

export default function ManualConditionsForm({ open, onClose, onSave }: ManualConditionsFormProps) {
  const [waterTemp, setWaterTemp] = useState('');
  const [depth, setDepth] = useState('');
  const [currentStrength, setCurrentStrength] = useState('중');
  const [waterColor, setWaterColor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      waterTemp: waterTemp ? parseFloat(waterTemp) : undefined,
      depth: depth ? parseFloat(depth) : undefined,
      currentStrength,
      waterColor: waterColor || undefined,
    });
    setWaterTemp('');
    setDepth('');
    setCurrentStrength('중');
    setWaterColor('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>조건 수동 입력</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="waterTemp">수온 (°C)</Label>
            <Input
              id="waterTemp"
              type="number"
              step="0.1"
              value={waterTemp}
              onChange={(e) => setWaterTemp(e.target.value)}
              placeholder="예: 18.5"
            />
          </div>
          
          <div>
            <Label htmlFor="depth">수심 (m)</Label>
            <Input
              id="depth"
              type="number"
              step="0.1"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              placeholder="예: 5.0"
            />
          </div>

          <div>
            <Label>조류 세기</Label>
            <RadioGroup value={currentStrength} onValueChange={setCurrentStrength}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="약" id="weak" />
                <Label htmlFor="weak">약</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="중" id="medium" />
                <Label htmlFor="medium">중</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="강" id="strong" />
                <Label htmlFor="strong">강</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="waterColor">물색 (선택)</Label>
            <Input
              id="waterColor"
              type="text"
              value={waterColor}
              onChange={(e) => setWaterColor(e.target.value)}
              placeholder="예: 맑음, 탁함"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">
              저장
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
