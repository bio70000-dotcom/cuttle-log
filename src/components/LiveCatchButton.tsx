import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { db, CatchEvent } from '@/db/schema'
import { queueForSync } from '@/lib/sync'
import { compressImage } from '@/lib/imageUtils'
import { Camera, Fish, Minus, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Species = 'cuttle' | 'webfoot' | 'bigfin'

const SPECIES_LABELS: Record<Species, string> = {
  cuttle: '갑오징어',
  webfoot: '주꾸미',
  bigfin: '무늬오징어',
}

interface GpsState {
  lat: number
  lng: number
  accuracy: number
}

interface LiveCatchButtonProps {
  tripId: number | null
  rigSlot: 'A' | 'B' | 'C'
  egiSlot: 'A' | 'B' | 'C'
  conditionId?: number
  onError?: (msg: string) => void
  onSuccess?: (msg: string) => void
}

export function LiveCatchButton({
  tripId,
  rigSlot,
  egiSlot,
  conditionId,
  onError,
  onSuccess,
}: LiveCatchButtonProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [gps, setGps] = useState<GpsState | null>(null)
  const [species, setSpecies] = useState<Species>('cuttle')
  const [quantity, setQuantity] = useState(1)
  const [formData, setFormData] = useState({
    sizeCm: '',
    weight: '',
    kept: true,
    depth: '',
    note: '',
  })
  const [photoThumb, setPhotoThumb] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const watchIdRef = useRef<number | null>(null)

  // Start GPS watch when component mounts
  useEffect(() => {
    if (!navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        })
      },
      () => {
        // GPS error — keep previous gps or remain null
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const notify = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') onSuccess?.(msg)
    else onError?.(msg)
  }

  const saveCatchEvents = async (overrides?: Partial<CatchEvent>) => {
    const base: Omit<CatchEvent, 'id'> = {
      tripId: tripId!,
      at: new Date(),
      rigSlot,
      egiSlot,
      lat: gps?.lat,
      lng: gps?.lng,
      conditionId,
      species,
      ...overrides,
    }

    for (let i = 0; i < quantity; i++) {
      const id = await db.catchEvents.add({ ...base })
      await queueForSync('catchEvent', { ...base, id })
    }
  }

  const handleQuickLog = async () => {
    if (!tripId) {
      notify('error', '출조를 먼저 시작해주세요')
      return
    }

    try {
      if ('vibrate' in navigator) navigator.vibrate(50)
      await saveCatchEvents()
      const label = SPECIES_LABELS[species]
      const timeStr = new Date().toLocaleTimeString('ko-KR')
      notify(
        'success',
        quantity > 1
          ? `${label} ${quantity}마리 기록 완료 — ${timeStr}`
          : `${label} 기록 완료 — ${timeStr} 단차${rigSlot} · 에기${egiSlot}`
      )
    } catch {
      notify('error', '기록 실패. 다시 시도해주세요')
    }
  }

  const handleDetailedLog = async () => {
    if (!tripId) {
      notify('error', '출조를 먼저 시작해주세요')
      return
    }

    try {
      await saveCatchEvents({
        sizeCm: formData.sizeCm ? parseFloat(formData.sizeCm) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        kept: formData.kept,
        depth: formData.depth ? parseFloat(formData.depth) : undefined,
        note: formData.note || undefined,
        photoThumb: photoThumb ?? undefined,
      })

      const label = SPECIES_LABELS[species]
      notify(
        'success',
        formData.sizeCm
          ? `${label} 기록 완료 — ${formData.sizeCm}cm`
          : `${label} 기록 완료`
      )

      setShowDetails(false)
      setFormData({ sizeCm: '', weight: '', kept: true, depth: '', note: '' })
      setPhotoThumb(null)
      setQuantity(1)
    } catch {
      notify('error', '기록 실패. 다시 시도해주세요')
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setPhotoThumb(compressed)
    } catch {
      notify('error', '사진 처리 실패')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const gpsLabel = gps ? `GPS ±${gps.accuracy}m` : 'GPS 대기중...'

  return (
    <>
      {/* Species selector */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(SPECIES_LABELS) as [Species, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSpecies(key)}
            className={cn(
              'h-12 rounded-lg border text-sm font-medium transition-all',
              species === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Quantity counter */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">수량</span>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="w-6 text-center text-base font-semibold">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main quick-log button */}
      <Button
        size="lg"
        onClick={handleQuickLog}
        onContextMenu={(e) => {
          e.preventDefault()
          setShowDetails(true)
        }}
        className="w-full h-20 text-lg font-bold"
        disabled={!tripId}
      >
        <Fish className="w-6 h-6 mr-2" />
        + {SPECIES_LABELS[species]} 기록
      </Button>

      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>길게 눌러 상세 입력</span>
        <span>{gpsLabel}</span>
      </div>

      {/* Detailed log dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상세 기록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Species in dialog */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">어종</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(SPECIES_LABELS) as [Species, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSpecies(key)}
                    className={cn(
                      'h-12 rounded-lg border text-sm font-medium transition-all',
                      species === key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity in dialog */}
            <div className="flex items-center justify-between">
              <Label>수량</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-6 text-center text-base font-semibold">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size">크기 (cm)</Label>
                <Input
                  id="size"
                  type="number"
                  value={formData.sizeCm}
                  onChange={(e) => setFormData({ ...formData, sizeCm: e.target.value })}
                  placeholder="28"
                  className="h-12 mt-1"
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
                  className="h-12 mt-1"
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
                className="h-12 mt-1"
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

            {/* Photo capture */}
            <div>
              <Label>사진</Label>
              <div className="mt-1">
                {photoThumb ? (
                  <div className="relative inline-block">
                    <img
                      src={photoThumb}
                      alt="catch thumbnail"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoThumb(null)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                      aria-label="사진 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="photo-input"
                    className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">사진 촬영</span>
                  </label>
                )}
                <input
                  ref={fileInputRef}
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="note">메모</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="특이사항 기록..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* GPS status in dialog */}
            <p className="text-xs text-muted-foreground">{gpsLabel}</p>

            <Button onClick={handleDetailedLog} className="w-full h-12">
              기록 완료
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
