import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export type PresetValues = {
  sinkerStepType: 'step' | 'custom'
  sinkerStepValue?: number
  sinkerCustomPair?: [number, number]
  branchLenType: 'step' | 'custom'
  branchLenValue?: number
  branchLenCustomPair?: [number, number]
}

export type PresetEditorProps = {
  initial?: Partial<PresetValues>
  onCancel?: () => void
  onSave?: (values: PresetValues) => void
  title?: string
  stepRange?: { min: number; max: number }
}

const defaultStepRange = { min: 0, max: 200 }

function build5cmOptions(range: { min: number; max: number }) {
  const items: number[] = []
  const start = Math.ceil(range.min / 5) * 5
  const end = Math.floor(range.max / 5) * 5
  for (let v = start; v <= end; v += 5) items.push(v)
  return items
}

function parseIntSafe(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return Math.trunc(n)
}

export default function PresetEditor({
  initial,
  onCancel,
  onSave,
  title = '프리셋 편집',
  stepRange = defaultStepRange,
}: PresetEditorProps) {
  // 봉돌단차
  const [sinkerType, setSinkerType] = useState<'step' | 'custom'>(
    initial?.sinkerStepType ?? 'step'
  )
  const [sinkerStep, setSinkerStep] = useState<number | undefined>(
    initial?.sinkerStepValue
  )
  const [sinkerCustom1, setSinkerCustom1] = useState<string>(
    initial?.sinkerCustomPair ? String(initial.sinkerCustomPair[0]) : ''
  )
  const [sinkerCustom2, setSinkerCustom2] = useState<string>(
    initial?.sinkerCustomPair ? String(initial.sinkerCustomPair[1]) : ''
  )

  // 가지줄길이
  const [branchType, setBranchType] = useState<'step' | 'custom'>(
    initial?.branchLenType ?? 'step'
  )
  const [branchStep, setBranchStep] = useState<number | undefined>(
    initial?.branchLenValue
  )
  const [branchCustom1, setBranchCustom1] = useState<string>(
    initial?.branchLenCustomPair ? String(initial.branchLenCustomPair[0]) : ''
  )
  const [branchCustom2, setBranchCustom2] = useState<string>(
    initial?.branchLenCustomPair ? String(initial.branchLenCustomPair[1]) : ''
  )

  const stepOptions = useMemo(() => build5cmOptions(stepRange), [stepRange])

  const validate = (): PresetValues | null => {
    // 봉돌단차
    let sinkerStepValue: number | undefined
    let sinkerCustomPair: [number, number] | undefined
    if (sinkerType === 'step') {
      if (typeof sinkerStep !== 'number') {
        toast.error('봉돌단차(5cm 단위)를 선택해주세요.')
        return null
      }
      sinkerStepValue = sinkerStep
    } else {
      const v1 = parseIntSafe(sinkerCustom1)
      const v2 = parseIntSafe(sinkerCustom2)
      if (v1 == null || v2 == null) {
        toast.error('봉돌단차 사용자 지정 값 2개를 모두 입력해주세요.')
        return null
      }
      sinkerCustomPair = [v1, v2]
    }

    // 가지줄길이
    let branchLenValue: number | undefined
    let branchLenCustomPair: [number, number] | undefined
    if (branchType === 'step') {
      if (typeof branchStep !== 'number') {
        toast.error('가지줄길이(5cm 단위)를 선택해주세요.')
        return null
      }
      branchLenValue = branchStep
    } else {
      const v1 = parseIntSafe(branchCustom1)
      const v2 = parseIntSafe(branchCustom2)
      if (v1 == null || v2 == null) {
        toast.error('가지줄길이 사용자 지정 값 2개를 모두 입력해주세요.')
        return null
      }
      branchLenCustomPair = [v1, v2]
    }

    return {
      sinkerStepType: sinkerType,
      sinkerStepValue,
      sinkerCustomPair,
      branchLenType: branchType,
      branchLenValue,
      branchLenCustomPair,
    }
  }

  const handleSave = () => {
    const v = validate()
    if (!v) return
    onSave?.(v)
    toast.success('프리셋이 저장되었습니다.')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* 봉돌단차 */}
        <section>
          <div className="mb-3">
            <Label className="text-base">봉돌단차 (cm)</Label>
          </div>

          <RadioGroup
            value={sinkerType}
            onValueChange={(v) => setSinkerType(v as 'step' | 'custom')}
            className="grid grid-cols-2 gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="sinker-step" value="step" />
              <Label htmlFor="sinker-step">5cm 단위로 선택</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="sinker-custom" value="custom" />
              <Label htmlFor="sinker-custom">사용자 지정(숫자 2개)</Label>
            </div>
          </RadioGroup>

          {sinkerType === 'step' ? (
            <div className="mt-3">
              <Label className="mb-1 block text-sm text-muted-foreground">
                값 선택 (cm)
              </Label>
              <Select
                value={sinkerStep != null ? String(sinkerStep) : undefined}
                onValueChange={(v) => setSinkerStep(Number(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {stepOptions.map((v) => (
                    <SelectItem key={`sink-${v}`} value={String(v)}>
                      {v} cm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground">
                  값 1 (cm)
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="예: 35"
                  value={sinkerCustom1}
                  onChange={(e) => setSinkerCustom1(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground">
                  값 2 (cm)
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="예: 45"
                  value={sinkerCustom2}
                  onChange={(e) => setSinkerCustom2(e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        {/* 가지줄길이 */}
        <section>
          <div className="mb-3">
            <Label className="text-base">가지줄길이 (cm)</Label>
          </div>

          <RadioGroup
            value={branchType}
            onValueChange={(v) => setBranchType(v as 'step' | 'custom')}
            className="grid grid-cols-2 gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="branch-step" value="step" />
              <Label htmlFor="branch-step">5cm 단위로 선택</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="branch-custom" value="custom" />
              <Label htmlFor="branch-custom">사용자 지정(숫자 2개)</Label>
            </div>
          </RadioGroup>

          {branchType === 'step' ? (
            <div className="mt-3">
              <Label className="mb-1 block text-sm text-muted-foreground">
                값 선택 (cm)
              </Label>
              <Select
                value={branchStep != null ? String(branchStep) : undefined}
                onValueChange={(v) => setBranchStep(Number(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {stepOptions.map((v) => (
                    <SelectItem key={`branch-${v}`} value={String(v)}>
                      {v} cm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground">
                  값 1 (cm)
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="예: 55"
                  value={branchCustom1}
                  onChange={(e) => setBranchCustom1(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground">
                  값 2 (cm)
                </Label>
                <Input
                  inputMode="numeric"
                  placeholder="예: 65"
                  value={branchCustom2}
                  onChange={(e) => setBranchCustom2(e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex items-center gap-3">
          <Button variant="default" onClick={handleSave}>
            저장
          </Button>
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
