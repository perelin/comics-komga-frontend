import { Link } from 'react-router-dom'
import { Play, CheckCheck, RotateCcw } from 'lucide-react'
import type { SeriesVM } from '@/lib/komga/mapping'
import { useMarkSeries } from '@/lib/komga/mutations'
import { useSeriesPages } from '@/lib/komga/queries'
import { pagesLabel } from '@/lib/komga/books'
import { facetHref } from '@/lib/komga/filters'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CoverImage } from './CoverImage'
import { FacetFilterButton } from './FacetFilterButton'
import { ReadProgress } from './ReadProgress'
import { Stars } from './Stars'
import { StatusDot } from './StatusDot'
import { AddToReadListButton } from './AddToReadListButton'

export function SeriesCard({ s }: { s: SeriesVM }) {
  const done = s.progress.total > 0 && s.progress.read >= s.progress.total
  const markSeries = useMarkSeries()
  const isMobile = useIsMobile()
  const { data: pages } = useSeriesPages(s.id, s.progress.total)
  const meta = [s.year, pagesLabel(pages, s.progress.total)].filter(Boolean).join(' · ')
  const onMark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    markSeries.mutate({ seriesId: s.id, read: !done })
  }
  return (
    <Link to={`/series/${s.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted">
        <CoverImage src={s.coverUrl} alt={s.title} />
        {!done && <div className="absolute right-1.5 top-1.5"><ReadProgress variant="ring" progress={s.progress} /></div>}
        {!isMobile && (
          <div className="pointer-events-none absolute inset-0 flex items-end gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded bg-primary p-1.5 text-primary-foreground"><Play className="size-3.5" /></span>
            <button
              type="button"
              onClick={onMark}
              disabled={markSeries.isPending}
              aria-label={done ? 'Mark all unread' : 'Mark all read'}
              className="pointer-events-auto rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:opacity-50"
            >
              {done ? <RotateCcw className="size-3.5" /> : <CheckCheck className="size-3.5" />}
            </button>
            <AddToReadListButton
              target={{ type: 'series', seriesId: s.id }}
              className="pointer-events-auto inline-flex rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
            />
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <StatusDot status={s.status} showLabel={false} />
          {s.authorNames.length > 0 ? (
            <FacetFilterButton href={facetHref({ authors: [s.authorNames[0]] })}
              className="min-w-0 flex-1 truncate text-left hover:text-foreground hover:underline">
              {s.author}
            </FacetFilterButton>
          ) : (
            <span className="flex-1 truncate">{s.author}</span>
          )}
          <span className="tabular-nums text-muted-foreground/60">{s.progress.total}</span>
        </div>
        <div className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground/70">{meta}</div>
        {s.rating && <div className="mt-1"><Stars rating={s.rating} size={12} /></div>}
      </div>
    </Link>
  )
}
