import { Link } from 'react-router-dom'
import { CheckCheck, RotateCcw } from 'lucide-react'
import { creatorMatches, type SeriesVM } from '@/lib/komga/mapping'
import { useMarkSeries } from '@/lib/komga/mutations'
import { useSeriesPages } from '@/lib/komga/queries'
import { pagesLabel } from '@/lib/komga/books'
import { facetHref } from '@/lib/komga/filters'
import { CoverImage } from './CoverImage'
import { CreatorMatches } from './CreatorMatches'
import { FacetFilterButton } from './FacetFilterButton'
import { StatusDot } from './StatusDot'
import { ReadProgress } from './ReadProgress'
import { Stars } from './Stars'

const FACET_CELL = 'block w-full truncate text-left hover:text-foreground hover:underline'

// Shared column template for the list header + rows.
// cover · Title · Author · Publisher · Status · Year · Books · Pages · Progress · Rating · Actions
export const SERIES_GRID_COLS = '40px minmax(0,2.5fr) minmax(0,1.2fr) minmax(0,1fr) 96px 56px 64px 84px 130px 96px 40px'

export function SeriesRow({ s, matchedCreators }: { s: SeriesVM; matchedCreators?: string[] }) {
  const { data: pages } = useSeriesPages(s.id, s.progress.total)
  const matches = creatorMatches(s.credits, matchedCreators ?? [])
  const done = s.progress.total > 0 && s.progress.read >= s.progress.total
  const markSeries = useMarkSeries()
  // Same quick action as on SeriesCard: flip the whole series read/unread
  // without following the row's link.
  const onMark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    markSeries.mutate({ seriesId: s.id, read: !done })
  }
  return (
    <Link to={`/series/${s.id}`}
      className="group grid h-[52px] items-center gap-3 border-b border-border px-3 text-sm hover:bg-accent/40"
      style={{ gridTemplateColumns: SERIES_GRID_COLS }}>
      <div className="h-9 w-6 overflow-hidden rounded-sm border border-border"><CoverImage src={s.coverUrl} alt={s.title} /></div>
      <div className="truncate font-medium text-foreground">{s.title}</div>
      <div className="min-w-0 text-muted-foreground">
        {s.authorNames.length > 0
          ? <FacetFilterButton href={facetHref({ authors: [s.authorNames[0]] })} className={FACET_CELL}>{s.author}</FacetFilterButton>
          : <span className="block truncate">{s.author}</span>}
        <CreatorMatches matches={matches} className="mt-0.5" />
      </div>
      <div className="truncate text-muted-foreground">
        {s.publisher && s.publisher !== '—'
          ? <FacetFilterButton href={facetHref({ publisher: [s.publisher] })} className={FACET_CELL}>{s.publisher}</FacetFilterButton>
          : s.publisher}
      </div>
      <div><StatusDot status={s.status} /></div>
      <div className="text-right tabular-nums text-muted-foreground">{s.year ?? '—'}</div>
      <div className="text-right tabular-nums text-muted-foreground">{s.progress.total}</div>
      <div className="text-right tabular-nums text-muted-foreground">{pagesLabel(pages, s.progress.total)}</div>
      <div><ReadProgress variant="bar" progress={s.progress} /></div>
      <div>{s.rating ? <Stars rating={s.rating} size={12} /> : <span className="text-muted-foreground/40">—</span>}</div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onMark}
          disabled={markSeries.isPending}
          aria-label={done ? 'Mark all unread' : 'Mark all read'}
          title={done ? 'Mark all unread' : 'Mark all read'}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:size-9 pointer-coarse:bg-accent/60 pointer-coarse:text-foreground pointer-coarse:opacity-100"
        >
          {done ? <RotateCcw className="size-3.5" /> : <CheckCheck className="size-3.5" />}
        </button>
      </div>
    </Link>
  )
}
