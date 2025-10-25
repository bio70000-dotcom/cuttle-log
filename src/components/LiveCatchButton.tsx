import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { db, CatchEvent } from '@/db/schema';
import { queueForSync } from '@/lib/sync';
import { useToast } from '@/hooks/use-toast';
import { Fish } from 'lucide-react';

interface LiveCatchButtonProps {
  tripId: number | null;
  rigSlot: 'A' | 'B' | 'C';
  egiSlot: 'A' | 'B' | 'C';
  currentLat?: number;
  currentLng?: number;
  conditionId?: number;
}

export function LiveCatchButton({ tripId, rigSlot, egiSlot, currentLat, currentLng, conditionId }: LiveCatchButtonProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({
    sizeCm: '',
    weight: '',
    kept: true,
    depth: '',
    note: '',
  });
  const { toast } = useToast();

  const handleQuickLog = async () => {
    if (!tripId) {
      toast({
        title: '출조를 먼저 시작해주세요',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      const catchEvent: Omit<CatchEvent, 'id'> = {
        tripId,
        at: new Date(),
        rigSlot,
        egiSlot,
        lat: currentLat,
        lng: currentLng,
        conditionId,
      };

      const id = await db.catchEvents.add(catchEvent);
      await queueForSync('catchEvent', { ...catchEvent, id });

      toast({
        title: '갑오징어 기록 완료',
        description: `${new Date().toLocaleTimeString('ko-KR')} - 단차${rigSlot} · 에기${egiSlot}`,
      });
    } catch (error) {
      console.error('Failed to log catch:', error);
      toast({
        title: '기록 실패',
        description: '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  const handleDetailedLog = async () => {
    if (!tripId) {
      toast({
        title: '출조를 먼저 시작해주세요',
        variant: 'destructive',
      });
      return;
    }

    try {
      const catchEvent: Omit<CatchEvent, 'id'> = {
        tripId,
        at: new Date(),
        rigSlot,
        egiSlot,
        lat: currentLat,
        lng: currentLng,
        conditionId,
        sizeCm: formData.sizeCm ? parseFloat(formData.sizeCm) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        kept: formData.kept,
        depth: formData.depth ? parseFloat(formData.depth) : undefined,
        note: formData.note || undefined,
      };

      const id = await db.catchEvents.add(catchEvent);
      await queueForSync('catchEvent', { ...catchEvent, id });

      toast({
        title: '갑오징어 기록 완료',
        description: formData.sizeCm ? `${formData.sizeCm}cm` : undefined,
      });

      setShowDetails(false);
      setFormData({ sizeCm: '', weight: '', kept: true, depth: '', note: '' });
    } catch (error) {
      console.error('Failed to log catch:', error);
      toast({
        title: '기록 실패',
        description: '다시 시도해주세요',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        size="lg"
        onClick={handleQuickLog}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowDetails(true);
        }}
        className="w-full h-20 text-lg font-bold"
        disabled={!tripId}
      >
        <Fish className="w-6 h-6 mr-2" />
        + 갑오징어 기록
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-1">
        길게 눌러 상세 입력
      </p>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상세 기록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size">크기 (cm)</Label>
                <Input
                  id="size"
                  type="number"
                  value={formData.sizeCm}
                  onChange={(e) => setFormData({ ...formData, sizeCm: e.target.value })}
                  placeholder="28"
                />
              </div>
              <div>
                <Label htmlFor="weight">무게 (g)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="depth">수심 (m)</Label>
              <Input
                id="depth"
                type="number"
                value={formData.depth}
                onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                placeholder="15"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="kept">보관</Label>
              <Switch
                id="kept"
                checked={formData.kept}
                onCheckedChange={(checked) => setFormData({ ...formData, kept: checked })}
              />
            </div>

            <div>
              <Label htmlFor="note">메모</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="특이사항 기록..."
                rows={3}
              />
            </div>

            <Button onClick={handleDetailedLog} className="w-full">
              기록 완료
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
