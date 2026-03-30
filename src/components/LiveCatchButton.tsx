import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { db, CatchEvent } from '@/db/schema'
import { queueForSync } from '@/lib/sync'
import { compressImage } from '@/lib/imageUtils'
import { Camera, Fish, X } from 'lucide-react'
import { toast } from 'sonner'

interface LiveCatchButtonProps {
  tripId: number | null
  rigSlot: 'A' | 'B' | 'C'
  egiSlot: 'A' | 'B' | 'C'
  currentLat?: number
  currentLng?: number
  conditionId?: number
}

export function LiveCatchButton({
  tripId,
  rigSlot,
  egiSlot,
  currentLat,
  currentLng,
  conditionId,
}: LiveCatchButtonProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [formData, setFormData] = useState({
    sizeCm: '',
    weight: '',
    kept: true,
    depth: '',
    note: '',
  })
  const [photoThumb, setPhotoThumb] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleQuickLog = async () => {
    if (!tripId) {
      toast.error('출조를 먼저 시작해주세요')
      return
    }

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }

      const catchEvent: Omit<CatchEvent, 'id'> = {
        tripId,
        at: new Date(),
        rigSlot,
        egiSlot,
        lat: currentLat,
        lng: currentLng,
        conditionId,
      }

      const id = await db.catchEvents.add(catchEvent)
      await queueForSync('catchEvent', { ...catchEvent, id })

      toast.success(`갑오징어 기록 완료 — ${new Date().toLocaleTimeString('ko-KR')} 단차${rigSlot} · 에기${egiSlot}`)
    } catch (error) {
      toast.error('기록 실패. 다시 시도해주세요')
    }
  }

  const handleDetailedLog = async () => {
    if (!tripId) {
      toast.error('출조를 먼저 시작해주세요')
      return
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
        photoThumb: photoThumb ?? undefined,
      }

      const id = await db.catchEvents.add(catchEvent)
      await queueForSync('catchEvent', { ...catchEvent, id })

      toast.success(formData.sizeCm ? `갑오징어 기록 완료 — ${formData.sizeCm}cm` : '갑오징어 기록 완료')

      setShowDetails(false)
      setFormData({ sizeCm: '', weight: '', kept: true, depth: '', note: '' })
      setPhotoThumb(null)
    } catch (error) {
      toast.error('기록 실패. 다시 시도해주세요')
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setPhotoThumb(compressed)
    } catch {
      toast.error('사진 처리 실패')
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
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
        + 갑오징어 기록
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-1">길게 눌러 상세 입력</p>

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

            <Button onClick={handleDetailedLog} className="w-full h-12">
              기록 완료
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
