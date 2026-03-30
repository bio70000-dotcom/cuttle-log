import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Props {
  tripId: number
}

export function ShareButton({ tripId }: Props) {
  const [open, setOpen] = useState(false)

  const shareUrl = `${window.location.origin}/shared/${tripId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('링크가 복사되었습니다')
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '출조 기록 공유',
          url: shareUrl,
        })
      } catch {
        // user cancelled or not supported — fall back to copy
        await handleCopy()
      }
    } else {
      await handleCopy()
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>출조 기록 공유</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              아래 링크로 출조 기록을 공유할 수 있습니다.
            </p>
            <Input value={shareUrl} readOnly className="text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                링크 복사
              </Button>
              <Button className="flex-1" onClick={handleShare}>
                공유하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
