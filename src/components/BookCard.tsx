import { Play, Check, RotateCcw, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { KomgaBookDto } from '@/lib/komga/types'
import { useMarkBook } from '@/lib/komga/mutations'
import { useIsMobile } from '@/hooks/useIsMobile'
import { bookReadState, bookCoverUrl, bookDownloadUrl, bookProgressPct, releaseYear } from '@/lib/komga/books'
import { komgaReaderUrl } from '@/lib/komga/reader'
import { triggerDownload } from '@/lib/download'
import { CoverImage } from './CoverImage'

/** Where a click on the card navigates:
 *  - `reader` (default): the whole card is the Komga reader deep-link, as on the
 *    series-detail Books tab. Play is decorative (the card already opens it).
 *  - `series`: the card links to the parent series page (flat Issues browse). Play
 *    becomes a real button that opens the reader — never a nested anchor. */
type LinkTarget = 'reader' | 'series'

/** Cover-forward card for a single volume — the Books-tab "card" view counterpart
 *  to the list row. Mirrors SeriesCard: the whole card is a deep-link, with hover
 *  quick-actions to read / mark read-unread / download (each stops navigation). */
export function BookCard({ book, seriesId, linkTarget = 'reader' }: {
  book: KomgaBookDto; seriesId: string; linkTarget?: LinkTarget
}) {
  const mark = useMarkBook(seriesId)
  const isMobile = useIsMobile()
  const state = bookReadState(book)
  const read = state === 'READ'
  const pct = bookProgressPct(book)
  const title = book.metadata.title || book.name
  const year = releaseYear(book.metadata.releaseDate)
  const readerUrl = komgaReaderUrl(book.id)

  const onMark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    mark.mutate({ bookId: book.id, read: !read })
  }

  const onDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerDownload(bookDownloadUrl(book.id))
  }

  // Opens the reader without nesting an <a> inside the series <Link>.
  const onOpenReader = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(readerUrl, '_blank', 'noopener,noreferrer')
  }

  const inner = (
    <>
      <div className={`relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-muted ${read ? 'brightness-[.62]' : ''}`}>
        <CoverImage src={bookCoverUrl(book.id)} alt={title} />
        {read && (
          <div data-testid="book-read" aria-label="Read"
            className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-green-500 text-black shadow">
            <Check className="size-3.5" />
          </div>
        )}
        {state === 'IN_PROGRESS' && (
          <div data-testid="book-progress"
            className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
            {pct}%
          </div>
        )}
        {!isMobile && (
          <div className="pointer-events-none absolute inset-0 flex items-end gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
            {linkTarget === 'series' ? (
              <button type="button" onClick={onOpenReader} aria-label="Read"
                className="pointer-events-auto rounded bg-primary p-1.5 text-primary-foreground transition-colors hover:brightness-110">
                <Play className="size-3.5" />
              </button>
            ) : (
              <span className="rounded bg-primary p-1.5 text-primary-foreground"><Play className="size-3.5" /></span>
            )}
            <button
              type="button"
              onClick={onMark}
              disabled={mark.isPending}
              aria-label={read ? 'Mark unread' : 'Mark read'}
              className="pointer-events-auto rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:opacity-50"
            >
              {read ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download"
              className="pointer-events-auto rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
            >
              <Download className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2">
        {/* Flat Issues browse spans many series → lead with the series title. */}
        {linkTarget === 'series' && (
          <div className="truncate text-sm font-semibold text-foreground">{book.seriesTitle}</div>
        )}
        <div className="truncate text-sm">
          <span className="text-muted-foreground">Vol. {book.metadata.number}</span>
          <span className="text-muted-foreground/50"> · </span>
          <span className={linkTarget === 'series' ? 'text-muted-foreground' : 'font-semibold text-foreground'}>{title}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
          <span>{book.media.pagesCount} pp</span>
          {year && <><span className="text-muted-foreground/50">·</span><span>{year}</span></>}
          <span className="text-muted-foreground/50">·</span>
          {read ? <span className="text-green-500">Read</span>
            : state === 'IN_PROGRESS' ? <span className="text-blue-400">{pct}%</span>
            : <span className="text-muted-foreground/60">Unread</span>}
        </div>
      </div>
    </>
  )

  return linkTarget === 'series' ? (
    <Link to={`/series/${book.seriesId}`} className="group block">{inner}</Link>
  ) : (
    <a href={readerUrl} target="_blank" rel="noreferrer" className="group block">{inner}</a>
  )
}
