import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, RigPreset, EgiPreset, RodPreset } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ArrowLeft, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const ROD_LENGTH_OPTIONS = [6.6, 7.0, 7.6, 8.0, 8.6, 9.0, 9.6]
const ROD_BRANDS = ['다이와', '시마노', '아부가르시아', '바낙스', '메이저크래프트']

// --- Rig Preset Section ---

function RigPresetSection() {
  const [selectedSlot, setSelectedSlot] = useState<'A' | 'B' | 'C'>('A')
  const rigPresets = useLiveQuery(() => db.rigPresets.toArray(), []) || []

  const currentRig = rigPresets.find((p) => p.slot === selectedSlot) || {
    slot: selectedSlot,
    name: '',
    sinkerDropLength: '15cm',
    branchLineLength: '10cm',
    notes: '',
  }

  const handleSaveRig = async (preset: Partial<RigPreset>) => {
    try {
      const existing = rigPresets.find((p) => p.slot === selectedSlot)
      if (existing?.id) {
        await db.rigPresets.update(existing.id, preset)
      } else {
        await db.rigPresets.add({ ...preset, slot: selectedSlot } as RigPreset)
      }
      toast.success('단차 프리셋 저장 완료')
    } catch (error) {
      toast.error('저장 실패')
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-2">
        {(['A', 'B', 'C'] as const).map((slot) => (
          <Button
            key={slot}
            variant={selectedSlot === slot ? 'default' : 'outline'}
            className="h-12 flex-1"
            onClick={() => setSelectedSlot(slot)}
          >
            {slot}
          </Button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          handleSaveRig({
            name: formData.get('rigName') as string,
            sinkerDropLength: formData.get('sinkerDrop') as string,
            branchLineLength: formData.get('branchLine') as string,
            notes: formData.get('rigNotes') as string,
          })
        }}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="rigName">프리셋 이름</Label>
            <Input
              id="rigName"
              name="rigName"
              defaultValue={currentRig.name}
              placeholder="예: 표준형"
              className="h-12 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="sinkerDrop">봉돌단차</Label>
            <Select name="sinkerDrop" defaultValue={currentRig.sinkerDropLength}>
              <SelectTrigger className="h-12 mt-1">
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
              <SelectTrigger className="h-12 mt-1">
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
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full h-12">
            <Save className="w-4 h-4 mr-2" />
            단차 프리셋 저장
          </Button>
        </div>
      </form>
    </div>
  )
}

// --- Egi Preset Section ---

function EgiPresetSection() {
  const [selectedSlot, setSelectedSlot] = useState<'A' | 'B' | 'C'>('A')
  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) || []

  const currentEgi = egiPresets.find((p) => p.slot === selectedSlot) || {
    slot: selectedSlot,
    name: '',
    size: '3.0',
    color: '핑크',
    finish: '광택',
    notes: '',
  }

  const handleSaveEgi = async (preset: Partial<EgiPreset>) => {
    try {
      const existing = egiPresets.find((p) => p.slot === selectedSlot)
      if (existing?.id) {
        await db.egiPresets.update(existing.id, preset)
      } else {
        await db.egiPresets.add({ ...preset, slot: selectedSlot } as EgiPreset)
      }
      toast.success('에기 프리셋 저장 완료')
    } catch (error) {
      toast.error('저장 실패')
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-2">
        {(['A', 'B', 'C'] as const).map((slot) => (
          <Button
            key={slot}
            variant={selectedSlot === slot ? 'default' : 'outline'}
            className="h-12 flex-1"
            onClick={() => setSelectedSlot(slot)}
          >
            {slot}
          </Button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          handleSaveEgi({
            name: formData.get('egiName') as string,
            size: formData.get('egiSize') as string,
            color: formData.get('egiColor') as string,
            finish: formData.get('egiFinish') as string,
            notes: formData.get('egiNotes') as string,
          })
        }}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="egiName">프리셋 이름</Label>
            <Input
              id="egiName"
              name="egiName"
              defaultValue={currentEgi.name}
              placeholder="예: 주간용"
              className="h-12 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="egiSize">사이즈</Label>
            <Select name="egiSize" defaultValue={currentEgi.size}>
              <SelectTrigger className="h-12 mt-1">
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
              <SelectTrigger className="h-12 mt-1">
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
              <SelectTrigger className="h-12 mt-1">
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
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full h-12">
            <Save className="w-4 h-4 mr-2" />
            에기 프리셋 저장
          </Button>
        </div>
      </form>
    </div>
  )
}

// --- Rod Preset Section ---

type RodFormState = {
  brand: string
  model: string
  lengthFt: string
  action: string
  power: string
  egiRange: string
  notes: string
}

function RodPresetSection() {
  const [selectedSlot, setSelectedSlot] = useState<'A' | 'B' | 'C'>('A')
  const rodPresets = useLiveQuery(() => db.rodPresets.toArray(), []) || []

  const currentRod = rodPresets.find((p) => p.slot === selectedSlot)

  const [form, setForm] = useState<RodFormState>({
    brand: currentRod?.brand ?? '',
    model: currentRod?.model ?? '',
    lengthFt: currentRod?.lengthFt ? String(currentRod.lengthFt) : '',
    action: currentRod?.action ?? '',
    power: currentRod?.power ?? '',
    egiRange: currentRod?.egiRange ?? '',
    notes: currentRod?.notes ?? '',
  })

  // Sync form when slot changes
  const handleSlotChange = (slot: 'A' | 'B' | 'C') => {
    setSelectedSlot(slot)
    const rod = rodPresets.find((p) => p.slot === slot)
    setForm({
      brand: rod?.brand ?? '',
      model: rod?.model ?? '',
      lengthFt: rod?.lengthFt ? String(rod.lengthFt) : '',
      action: rod?.action ?? '',
      power: rod?.power ?? '',
      egiRange: rod?.egiRange ?? '',
      notes: rod?.notes ?? '',
    })
  }

  const handleSaveRod = async () => {
    try {
      const patch: Partial<RodPreset> = {
        brand: form.brand || undefined,
        model: form.model || undefined,
        lengthFt: form.lengthFt ? parseFloat(form.lengthFt) : undefined,
        action: (form.action as RodPreset['action']) || undefined,
        power: (form.power as RodPreset['power']) || undefined,
        egiRange: form.egiRange || undefined,
        notes: form.notes || undefined,
      }
      const existing = rodPresets.find((p) => p.slot === selectedSlot)
      if (existing?.id) {
        await db.rodPresets.update(existing.id, patch)
      } else {
        await db.rodPresets.add({ ...patch, slot: selectedSlot } as RodPreset)
      }
      toast.success('낚시대 프리셋 저장 완료')
    } catch (error) {
      toast.error('저장 실패')
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-2">
        {(['A', 'B', 'C'] as const).map((slot) => (
          <Button
            key={slot}
            variant={selectedSlot === slot ? 'default' : 'outline'}
            className="h-12 flex-1"
            onClick={() => handleSlotChange(slot)}
          >
            {slot}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="rodBrand">브랜드</Label>
          <Input
            id="rodBrand"
            list="rod-brands"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            placeholder="예: 다이와"
            className="h-12 mt-1"
          />
          <datalist id="rod-brands">
            {ROD_BRANDS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="rodModel">모델명</Label>
          <Input
            id="rodModel"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="예: 월하미인 AGS"
            className="h-12 mt-1"
          />
        </div>

        <div>
          <Label htmlFor="rodLength">길이 (ft)</Label>
          <Select
            value={form.lengthFt}
            onValueChange={(v) => setForm({ ...form, lengthFt: v })}
          >
            <SelectTrigger className="h-12 mt-1">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {ROD_LENGTH_OPTIONS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {l} ft
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">액션</Label>
          <ToggleGroup
            type="single"
            value={form.action}
            onValueChange={(v) => v && setForm({ ...form, action: v })}
            className="justify-start"
          >
            <ToggleGroupItem value="fast" className="h-12 flex-1">
              패스트
            </ToggleGroupItem>
            <ToggleGroupItem value="medium" className="h-12 flex-1">
              미디엄
            </ToggleGroupItem>
            <ToggleGroupItem value="slow" className="h-12 flex-1">
              슬로우
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <Label className="mb-2 block">파워</Label>
          <ToggleGroup
            type="single"
            value={form.power}
            onValueChange={(v) => v && setForm({ ...form, power: v })}
            className="justify-start"
          >
            {(['UL', 'L', 'ML', 'M', 'MH'] as const).map((p) => (
              <ToggleGroupItem key={p} value={p} className="h-12 flex-1">
                {p}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div>
          <Label htmlFor="rodEgiRange">적합 에기 호수</Label>
          <Input
            id="rodEgiRange"
            value={form.egiRange}
            onChange={(e) => setForm({ ...form, egiRange: e.target.value })}
            placeholder="예: 2.5~3.5호"
            className="h-12 mt-1"
          />
        </div>

        <div>
          <Label htmlFor="rodNotes">메모</Label>
          <Textarea
            id="rodNotes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="예: 갑오징어 전용"
            rows={2}
            className="mt-1"
          />
        </div>

        <Button onClick={handleSaveRod} className="w-full h-12">
          <Save className="w-4 h-4 mr-2" />
          낚시대 프리셋 저장
        </Button>
      </div>
    </div>
  )
}

// --- Page ---

export default function PresetEditorPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">프리셋 편집</h1>
      </div>

      <Tabs defaultValue="rig">
        <TabsList className="w-full">
          <TabsTrigger value="rig" className="flex-1">
            단차
          </TabsTrigger>
          <TabsTrigger value="egi" className="flex-1">
            에기
          </TabsTrigger>
          <TabsTrigger value="rod" className="flex-1">
            낚시대
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rig">
          <RigPresetSection />
        </TabsContent>

        <TabsContent value="egi">
          <EgiPresetSection />
        </TabsContent>

        <TabsContent value="rod">
          <RodPresetSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
