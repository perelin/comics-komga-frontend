import { Link } from 'react-router-dom'
import type { SeriesVM } from '@/lib/komga/mapping'
import { useSeriesPages } from '@/lib/komga/queries'
import { pagesLabel } from '@/lib/komga/books'
import { CoverImage } from './CoverImage'
import { StatusDot } from './StatusDot'
import { ReadProgress } from './ReadProgress'
import { Stars } from './Stars'

// Shared column template for the list header + rows.
// cover · Title · Author · Publisher · Status · Year · Books · Pages · Progress · Rating
export const SERIES_GRID_COLS = '40px minmax(0,2.5fr) minmax(0,1.2fr) minmax(0,1fr) 96px 56px 64px 84px 130px 96px'

export function SeriesRow({ s }: { s: SeriesVM }) {
  const { data: pages } = useSeriesPages(s.id, s.progress.total)
  return (
    <Link to={`/series/${s.id}`}
      className="grid h-[52px] items-center gap-3 border-b border-border px-3 text-sm hover:bg-accent/40"
      style={{ gridTemplateColumns: SERIES_GRID_COLS }}>
      <div className="h-9 w-6 overflow-hidden rounded-sm border border-border"><CoverImage src={s.coverUrl} alt={s.title} /></div>
      <div className="truncate font-medium text-foreground">{s.title}</div>
      <div className="truncate text-muted-foreground">{s.author}</div>
      <div className="truncate text-muted-foreground">{s.publisher}</div>
      <div><StatusDot status={s.status} /></div>
      <div className="text-right tabular-nums text-muted-foreground">{s.year ?? '—'}</div>
      <div className="text-right tabular-nums text-muted-foreground">{s.progress.total}</div>
      <div className="text-right tabular-nums text-muted-foreground">{pagesLabel(pages, s.progress.total)}</div>
      <div><ReadProgress variant="bar" progress={s.progress} /></div>
      <div>{s.rating ? <Stars rating={s.rating} size={12} /> : <span className="text-muted-foreground/40">—</span>}</div>
    </Link>
  )
}
