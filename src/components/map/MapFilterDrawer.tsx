// src/components/map/MapFilterDrawer.tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { db } from '@/db/schema'
import { MapFilterState, DEFAULT_FILTER, activeFilterCount } from '@/types/mapFilter'

interface Props {
  filter: MapFilterState
  onChange: (next: MapFilterState) => void
}

export default function MapFilterDrawer({ filter, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MapFilterState>(filter)

  const egiPresets = useLiveQuery(() => db.egiPresets.toArray(), []) ?? []
  const uniqueColors = Array.from(
    new Set(egiPresets.map((e) => e.color).filter((c): c is string => !!c))
  )

  const badgeCount = activeFilterCount(filter)

  const handleOpen = () => {
    setDraft(filter)
    setOpen(true)
  }

  const handleApply = () => {
    onChange(draft)
    setOpen(false)
  }

  const handleReset = () => {
    setDraft(DEFAULT_FILTER)
  }

  // Toggle helpers — all immutable
  const toggleMulti = (key: keyof Pick<MapFilterState, 'species' | 'egiColors' | 'tideGroup'>, value: string) => {
    const current = draft[key] as string[]
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setDraft({ ...draft, [key]: next })
  }

  const setSingle = <K extends 'period' | 'fishingType'>(
    key: K,
    value: MapFilterState[K]
  ) => {
    setDraft({ ...draft, [key]: value })
  }

  return (
    <>
      {/* Floating filter button */}
      <Button
        onClick={handleOpen}
        className="absolute bottom-6 left-6 z-[1000] shadow-lg gap-2"
        size="lg"
        variant={badgeCount > 0 ? 'default' : 'secondary'}
      >
        <SlidersHorizontal className="w-4 h-4" />
        필터
        {badgeCount > 0 && (
          <span className="ml-1 bg-white text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>조과 마커 필터</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-5">
            {/* 어종 */}
            <FilterSection label="어종">
              <ToggleGroup
                type="multiple"
                value={draft.species}
                onValueChange={(v) => setDraft({ ...draft, species: v })}
                className="flex-wrap justify-start"
              >
                {[
                  { value: 'cuttle', label: '갑오징어' },
                  { value: 'webfoot', label: '주꾸미' },
                  { value: 'bigfin', label: '무늬오징어' },
                ].map((item) => (
                  <ToggleGroupItem
                    key={item.value}
                    value={item.value}
                    size="sm"
                  >
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FilterSection>

            {/* 기간 */}
            <FilterSection label="기간">
              <ToggleGroup
                type="single"
                value={draft.period}
                onValueChange={(v) => v && setSingle('period', v as MapFilterState['period'])}
                className="flex-wrap justify-start"
              >
                {[
                  { value: '1m', label: '1개월' },
                  { value: '3m', label: '3개월' },
                  { value: '6m', label: '6개월' },
                  { value: 'all', label: '전체' },
                ].map((item) => (
                  <ToggleGroupItem key={item.value} value={item.value} size="sm">
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FilterSection>

            {/* 에기 색상 */}
            {uniqueColors.length > 0 && (
              <FilterSection label="에기 색상">
                <ToggleGroup
                  type="multiple"
                  value={draft.egiColors}
                  onValueChange={(v) => setDraft({ ...draft, egiColors: v })}
                  className="flex-wrap justify-start"
                >
                  {uniqueColors.map((color) => (
                    <ToggleGroupItem key={color} value={color} size="sm">
                      {color}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FilterSection>
            )}

            {/* 물때 */}
            <FilterSection label="물때">
              <ToggleGroup
                type="multiple"
                value={draft.tideGroup}
                onValueChange={(v) => setDraft({ ...draft, tideGroup: v })}
                className="flex-wrap justify-start"
              >
                {[
                  { value: 'sari', label: '사리 (1-4물)' },
                  { value: 'middle', label: '중간 (5-10물)' },
                  { value: 'jogeum', label: '조금 (11-15물)' },
                ].map((item) => (
                  <ToggleGroupItem key={item.value} value={item.value} size="sm">
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FilterSection>

            {/* 낚시 유형 */}
            <FilterSection label="낚시 유형">
              <ToggleGroup
                type="single"
                value={draft.fishingType}
                onValueChange={(v) => setSingle('fishingType', v ?? '')}
                className="flex-wrap justify-start"
              >
                {[
                  { value: '', label: '전체' },
                  { value: 'walking', label: '워킹' },
                  { value: 'boat', label: '선상' },
                ].map((item) => (
                  <ToggleGroupItem key={item.value || 'all'} value={item.value} size="sm">
                    {item.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FilterSection>
          </div>

          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              초기화
            </Button>
            <Button onClick={handleApply} className="flex-1">
              적용
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function FilterSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
