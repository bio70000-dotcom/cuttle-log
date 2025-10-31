// src/components/RegionBadge.tsx
import { classifyRegion } from '@/utils/region'

type Props = {
  lat: number
  lon: number
  className?: string
  prefix?: string // 기본 '지역'
}

export default function RegionBadge({
  lat,
  lon,
  className = '',
  prefix = '지역',
}: Props) {
  const region = classifyRegion({ lat, lon })
  return (
    <span
      className={
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm shadow-sm bg-white/85 ' +
        className
      }
      title={`${prefix}: ${region}`}
    >
      <strong className="font-medium">{prefix}:</strong>
      <span>{region}</span>
    </span>
  )
}
