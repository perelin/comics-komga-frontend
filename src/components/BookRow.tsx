import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { KomgaBookDto } from '@/lib/komga/types'
import { bookReadState, bookCoverUrl, bookProgressPct, releaseYear } from '@/lib/komga/books'
import { CoverImage } from './CoverImage'

// cover · Series · Vol# · Title · Pages · Year · Progress
export const BOOK_GRID_COLS = '40px minmax(0,1.6fr) 48px minmax(0,2fr) 64px 56px 130px'

/** One flat-Issues list row. The whole row links to the book's parent series
 *  (the browse dimension has no book-detail page), mirroring SeriesRow. */
export function BookRow({ b }: { b: KomgaBookDto }) {
  const st = bookReadState(b)
  const pct = bookProgressPct(b)
  const title = b.metadata.title || b.name
  return (
    <Link to={`/series/${b.seriesId}`}
      className="grid h-[52px] items-center gap-3 border-b border-border px-3 text-sm hover:bg-accent/40"
      style={{ gridTemplateColumns: BOOK_GRID_COLS }}>
      <div className="h-9 w-6 overflow-hidden rounded-sm border border-border"><CoverImage src={bookCoverUrl(b.id)} alt={title} /></div>
      <div className="truncate font-medium text-foreground">{b.seriesTitle}</div>
      <div className={`text-right tabular-nums ${st === 'UNREAD' ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{b.metadata.number}</div>
      <div className="truncate text-muted-foreground">{title}</div>
      <div className="text-right tabular-nums text-muted-foreground">{b.media.pagesCount}</div>
      <div className="text-right tabular-nums text-muted-foreground">{releaseYear(b.metadata.releaseDate) ?? '—'}</div>
      <div className="text-sm">
        {st === 'READ' ? (
          <span className="inline-flex items-center gap-1 text-green-500"><Check className="size-3.5" /> Read</span>
        ) : st === 'IN_PROGRESS' ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-16 overflow-hidden rounded bg-muted">
              <span className="block h-full rounded bg-primary" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-xs tabular-nums text-primary">{pct}%</span>
          </span>
        ) : (
          <span className="text-muted-foreground/50">Unread</span>
        )}
      </div>
    </Link>
  )
}
