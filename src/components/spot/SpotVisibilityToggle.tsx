import { Globe, Lock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface Props {
  isPublic: boolean
  onChange: (next: boolean) => void
}

export function SpotVisibilityToggle({ isPublic, onChange }: Props) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {isPublic ? (
          <Globe className="w-4 h-4 text-primary" />
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">포인트 공개</span>
        <Badge variant={isPublic ? 'default' : 'secondary'} className="text-xs">
          {isPublic ? '공개' : '비공개'}
        </Badge>
      </div>
      <Switch
        checked={isPublic}
        onCheckedChange={onChange}
        aria-label="포인트 공개 여부"
      />
    </div>
  )
}
