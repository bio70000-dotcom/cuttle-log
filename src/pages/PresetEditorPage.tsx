import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, RigPreset, EgiPreset } from '@/db/schema';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PresetEditorPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRigSlot, setSelectedRigSlot] = useState<'A' | 'B' | 'C'>('A');
  const [selectedEgiSlot, setSelectedEgiSlot] = useState<'A' | 'B' | 'C'>('A');

  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) || [];
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) || [];

  const currentRig = rigPresets.find(p => p.slot === selectedRigSlot) || {
    slot: selectedRigSlot,
    name: '',
    sinkerDropLength: '15cm',
    branchLineLength: '10cm',
    notes: '',
  };

  const currentEgi = egiPresets.find(p => p.slot === selectedEgiSlot) || {
    slot: selectedEgiSlot,
    name: '',
    size: '3.0',
    color: '핑크',
    finish: '광택',
    notes: '',
  };

  const handleSaveRig = async (preset: Partial<RigPreset>) => {
    try {
      const existing = rigPresets.find(p => p.slot === selectedRigSlot);
      if (existing?.id) {
        await db.rigPresets.update(existing.id, preset);
      } else {
        await db.rigPresets.add({ ...preset, slot: selectedRigSlot } as RigPreset);
      }
      toast({ title: '단차 프리셋 저장 완료' });
    } catch (error) {
      console.error('Failed to save rig preset:', error);
      toast({ title: '저장 실패', variant: 'destructive' });
    }
  };

  const handleSaveEgi = async (preset: Partial<EgiPreset>) => {
    try {
      const existing = egiPresets.find(p => p.slot === selectedEgiSlot);
      if (existing?.id) {
        await db.egiPresets.update(existing.id, preset);
      } else {
        await db.egiPresets.add({ ...preset, slot: selectedEgiSlot } as EgiPreset);
      }
      toast({ title: '에기 프리셋 저장 완료' });
    } catch (error) {
      console.error('Failed to save egi preset:', error);
      toast({ title: '저장 실패', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">프리셋 편집</h1>
      </div>

      {/* Rig Preset Editor */}
      <Card className="p-4 mb-4">
        <h2 className="font-semibold mb-4">단차 프리셋</h2>
        
        <div className="flex gap-2 mb-4">
          {(['A', 'B', 'C'] as const).map(slot => (
            <Button
              key={slot}
              variant={selectedRigSlot === slot ? 'default' : 'outline'}
              onClick={() => setSelectedRigSlot(slot)}
            >
              {slot}
            </Button>
          ))}
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSaveRig({
            name: formData.get('rigName') as string,
            sinkerDropLength: formData.get('sinkerDrop') as string,
            branchLineLength: formData.get('branchLine') as string,
            notes: formData.get('rigNotes') as string,
          });
        }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rigName">프리셋 이름</Label>
              <Input
                id="rigName"
                name="rigName"
                defaultValue={currentRig.name}
                placeholder="예: 표준형"
              />
            </div>

            <div>
              <Label htmlFor="sinkerDrop">봉돌단차</Label>
              <Select name="sinkerDrop" defaultValue={currentRig.sinkerDropLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10cm">10cm</SelectItem>
                  <SelectItem value="15cm">15cm</SelectItem>
                  <SelectItem value="20cm">20cm</SelectItem>
                  <SelectItem value="25cm">25cm</SelectItem>
                  <SelectItem value="30cm">30cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="branchLine">가지줄단차</Label>
              <Select name="branchLine" defaultValue={currentRig.branchLineLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="직결">직결</SelectItem>
                  <SelectItem value="10cm">10cm</SelectItem>
                  <SelectItem value="15cm">15cm</SelectItem>
                  <SelectItem value="20cm">20cm</SelectItem>
                  <SelectItem value="25cm">25cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rigNotes">메모</Label>
              <Textarea
                id="rigNotes"
                name="rigNotes"
                defaultValue={currentRig.notes}
                placeholder="예: 조류 강할 때 사용"
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              단차 프리셋 저장
            </Button>
          </div>
        </form>
      </Card>

      {/* Egi Preset Editor */}
      <Card className="p-4">
        <h2 className="font-semibold mb-4">에기 프리셋</h2>
        
        <div className="flex gap-2 mb-4">
          {(['A', 'B', 'C'] as const).map(slot => (
            <Button
              key={slot}
              variant={selectedEgiSlot === slot ? 'default' : 'outline'}
              onClick={() => setSelectedEgiSlot(slot)}
            >
              {slot}
            </Button>
          ))}
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSaveEgi({
            name: formData.get('egiName') as string,
            size: formData.get('egiSize') as string,
            color: formData.get('egiColor') as string,
            finish: formData.get('egiFinish') as string,
            notes: formData.get('egiNotes') as string,
          });
        }}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="egiName">프리셋 이름</Label>
              <Input
                id="egiName"
                name="egiName"
                defaultValue={currentEgi.name}
                placeholder="예: 주간용"
              />
            </div>

            <div>
              <Label htmlFor="egiSize">사이즈</Label>
              <Select name="egiSize" defaultValue={currentEgi.size}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2.5">2.5호</SelectItem>
                  <SelectItem value="3.0">3.0호</SelectItem>
                  <SelectItem value="3.5">3.5호</SelectItem>
                  <SelectItem value="4.0">4.0호</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="egiColor">색상</Label>
              <Select name="egiColor" defaultValue={currentEgi.color}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="핑크">핑크</SelectItem>
                  <SelectItem value="오렌지">오렌지</SelectItem>
                  <SelectItem value="네온">네온</SelectItem>
                  <SelectItem value="야광">야광</SelectItem>
                  <SelectItem value="흰색">흰색</SelectItem>
                  <SelectItem value="검정">검정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="egiFinish">마감</Label>
              <Select name="egiFinish" defaultValue={currentEgi.finish}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="광택">광택</SelectItem>
                  <SelectItem value="무광">무광</SelectItem>
                  <SelectItem value="야광">야광</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="egiNotes">메모</Label>
              <Textarea
                id="egiNotes"
                name="egiNotes"
                defaultValue={currentEgi.notes}
                placeholder="예: 맑은 날 사용"
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              에기 프리셋 저장
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
