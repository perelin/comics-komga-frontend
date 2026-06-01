import { Link } from 'react-router-dom'
import { Play, CheckCheck, Pencil } from 'lucide-react'
import type { SeriesVM } from '@/lib/komga/mapping'
import { CoverImage } from './CoverImage'
import { ReadProgress } from './ReadProgress'
import { Stars } from './Stars'
import { StatusDot } from './StatusDot'

export function SeriesCard({ s }: { s: SeriesVM }) {
  const done = s.progress.total > 0 && s.progress.read >= s.progress.total
  return (
    <Link to={`/series/${s.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted">
        <CoverImage src={s.coverUrl} alt={s.title} />
        {!done && <div className="absolute right-1.5 top-1.5"><ReadProgress variant="ring" progress={s.progress} /></div>}
        <div className="pointer-events-none absolute inset-0 flex items-end gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded bg-primary p-1.5 text-primary-foreground"><Play className="size-3.5" /></span>
          <span className="rounded bg-black/60 p-1.5 text-white"><CheckCheck className="size-3.5" /></span>
          <span className="rounded bg-black/60 p-1.5 text-white"><Pencil className="size-3.5" /></span>
        </div>
      </div>
      <div className="mt-2">
        <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <StatusDot status={s.status} showLabel={false} />
          <span className="flex-1 truncate">{s.author}</span>
          <span className="tabular-nums text-muted-foreground/60">{s.progress.total}</span>
        </div>
        {s.rating && <div className="mt-1"><Stars rating={s.rating} size={12} /></div>}
      </div>
    </Link>
  )
}
