import { cn } from '@/lib/utils'
import { readPct, type Progress } from '@/lib/komga/progress'

export function ReadProgress({ progress, variant }: { progress: Progress; variant: 'ring' | 'bar' }) {
  const done = progress.total > 0 && progress.read >= progress.total
  const pct = readPct(progress)
  if (variant === 'bar') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1 w-14 overflow-hidden rounded bg-muted">
          <div className={cn('h-full rounded', done ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
        <span className={cn('text-xs tabular-nums', done ? 'text-green-500' : 'text-muted-foreground')}>
          {progress.read}/{progress.total}
        </span>
      </div>
    )
  }
  const size = 26, r = (size - 4) / 2, C = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  return (
    <svg width={size} height={size} className="block" aria-label={`${progress.read} of ${progress.total} read`}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
      {pct > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={2.4} strokeLinecap="round"
          className={cn(done ? 'stroke-green-500' : 'stroke-primary')}
          strokeDasharray={`${(C * pct) / 100} ${C}`} transform={`rotate(-90 ${cx} ${cy})`} />
      )}
      {done ? (
        <path d={`M${cx - 4} ${cy} l3 3 l5 -6`} fill="none" className="stroke-green-500"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle"
          className="fill-foreground text-[9px] font-semibold tabular-nums">
          {progress.total - progress.read}
        </text>
      )}
    </svg>
  )
}
