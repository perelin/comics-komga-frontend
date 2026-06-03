import { Play, Check, RotateCcw } from 'lucide-react'
import type { KomgaBookDto } from '@/lib/komga/types'
import { useMarkBook } from '@/lib/komga/mutations'
import { useIsMobile } from '@/hooks/useIsMobile'
import { bookReadState, bookCoverUrl, bookProgressPct, releaseYear } from '@/lib/komga/books'
import { komgaReaderUrl } from '@/lib/komga/reader'
import { CoverImage } from './CoverImage'

/** Cover-forward card for a single volume — the Books-tab "card" view counterpart
 *  to the list row. Mirrors SeriesCard: the whole card is the reader deep-link,
 *  with a hover quick-action to mark read/unread (stops link navigation). */
export function BookCard({ book, seriesId }: { book: KomgaBookDto; seriesId: string }) {
  const mark = useMarkBook(seriesId)
  const isMobile = useIsMobile()
  const state = bookReadState(book)
  const read = state === 'READ'
  const pct = bookProgressPct(book)
  const title = book.metadata.title || book.name
  const year = releaseYear(book.metadata.releaseDate)

  const onMark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    mark.mutate({ bookId: book.id, read: !read })
  }

  return (
    <a href={komgaReaderUrl(book.id)} target="_blank" rel="noreferrer" className="group block">
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
            <span className="rounded bg-primary p-1.5 text-primary-foreground"><Play className="size-3.5" /></span>
            <button
              type="button"
              onClick={onMark}
              disabled={mark.isPending}
              aria-label={read ? 'Mark unread' : 'Mark read'}
              className="pointer-events-auto rounded bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 disabled:opacity-50"
            >
              {read ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
            </button>
          </div>
        )}
      </div>
      <div className="mt-2">
        <div className="truncate text-sm">
          <span className="text-muted-foreground">Vol. {book.metadata.number}</span>
          <span className="text-muted-foreground/50"> · </span>
          <span className="font-semibold text-foreground">{title}</span>
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
    </a>
  )
}
