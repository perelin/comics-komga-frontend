import type { SeriesStatus } from '@/lib/komga/types'
import { cn } from '@/lib/utils'

const META: Record<SeriesStatus, { label: string; cls: string }> = {
  ONGOING: { label: 'Ongoing', cls: 'bg-green-500' },
  ENDED: { label: 'Ended', cls: 'bg-blue-500' },
  HIATUS: { label: 'Hiatus', cls: 'bg-amber-500' },
  ABANDONED: { label: 'Abandoned', cls: 'bg-red-500' },
}

export function StatusDot({ status, showLabel = true }: { status: SeriesStatus; showLabel?: boolean }) {
  const m = META[status]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground">
      <span
        className={cn('size-1.5 rounded-full', m.cls)}
        title={m.label}
        aria-label={m.label}
      />
      {showLabel && m.label}
    </span>
  )
}
