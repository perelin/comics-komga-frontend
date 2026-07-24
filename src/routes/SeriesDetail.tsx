import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ExternalLink, Check, RotateCcw, MoreVertical, LayoutGrid, List, BookmarkPlus, Download } from 'lucide-react'
import {
  useSeries, useSeriesBooks, useRelatedByPublisher, useLibraries,
} from '@/lib/komga/queries'
import { useMarkBook, useAddToReadList } from '@/lib/komga/mutations'
import { mapSeries, pickAuthor } from '@/lib/komga/mapping'
import { bookReadState, bookCoverUrl, bookDownloadUrl, releaseYear } from '@/lib/komga/books'
import { komgaReaderUrl, komgaSeriesUrl } from '@/lib/komga/reader'
import { triggerDownload } from '@/lib/download'
import { prettyLibraryName, libraryCrumbLabel } from '@/lib/library'
import { useSmartBack } from '@/hooks/useSmartBack'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CoverImage } from '@/components/CoverImage'
import { BookCard } from '@/components/BookCard'
import { StatusDot } from '@/components/StatusDot'
import { SeriesCard } from '@/components/SeriesCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { SeriesHero } from '@/components/SeriesHero'
import { SeriesMetaBand } from '@/components/SeriesMetaBand'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

const READING_DIR: Record<string, string> = {
  LEFT_TO_RIGHT: 'Left → right',
  RIGHT_TO_LEFT: 'Right → left',
  VERTICAL: 'Vertical',
  WEBTOON: 'Webtoon',
}

const ROW = 'grid grid-cols-[2.5rem_1.75rem_minmax(0,1fr)_4rem_4rem_8.5rem_2.25rem] items-center gap-3'

export function SeriesDetail() {
  const { id = '' } = useParams()
  const sq = useSeries(id)
  const bq = useSeriesBooks(id)
  const libs = useLibraries()
  const back = useSmartBack()

  if (sq.isLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>
  if (sq.isError || !sq.data) return (
    <div className="p-8 text-muted-foreground">
      Couldn&apos;t load this series. <button onClick={back} className="underline">Back</button>
    </div>
  )

  const dto = sq.data
  const s = mapSeries(dto)
  const books = bq.data?.content ?? []
  const rawLibraryName = libs.data?.find((l) => l.id === dto.libraryId)?.name ?? ''
  const libraryName = prettyLibraryName(rawLibraryName)
  const libraryCrumb = libraryCrumbLabel(rawLibraryName)
  const year = releaseYear(dto.booksMetadata.releaseDate)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* top bar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <button onClick={back} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Back to library">
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="shrink-0 hover:text-foreground">Library</Link>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
          {libraryName && (
            <>
              <Link to={`/?library=${dto.libraryId}`} className="shrink-0 hover:text-foreground">{libraryCrumb}</Link>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            </>
          )}
          <span className="truncate text-foreground">{s.title}</span>
        </div>
        <div className="flex-1" />
        <a
          href={komgaSeriesUrl(dto.id)} target="_blank" rel="noreferrer"
          aria-label="Open in Komga"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ExternalLink className="size-3.5" /> <span className="hidden md:inline">Open in Komga</span>
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <SeriesHero dto={dto} books={books} />
        <SeriesMetaBand dto={dto} books={books} />

        {/* tabs */}
        <Tabs defaultValue="books" className="px-6 pb-12">
          <TabsList variant="line" className="border-b border-border">
            <TabsTrigger value="books">
              Books <span className="ml-1 tabular-nums text-muted-foreground">{books.length}</span>
            </TabsTrigger>
            <TabsTrigger value="related">Related</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="pt-4">
            <BooksTab books={books} seriesId={dto.id} />
          </TabsContent>

          <TabsContent value="related" className="pt-4">
            <RelatedTab publisher={dto.metadata.publisher} excludeId={dto.id} />
          </TabsContent>

          <TabsContent value="metadata" className="pt-4">
            <MetadataTab dto={dto} year={year} libraryName={libraryName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

type BooksView = 'list' | 'card'

/** The Books tab: a persisted card/list switch over the series' volumes. List =
 *  the dense table; card = a cover-forward grid of BookCards. Defaults to card. */
function BooksTab({ books, seriesId }: { books: KomgaBookDto[]; seriesId: string }) {
  const isMobile = useIsMobile()
  const [view, setView] = usePersistentState<BooksView>('komga:booksView', 'card')
  const effectiveView = isMobile ? 'card' : view
  if (books.length === 0) return <div className="text-sm text-muted-foreground">No volumes.</div>
  return (
    <>
      <div className="mb-3 flex items-center">
        <span className="text-sm text-muted-foreground tabular-nums">
          {books.length} volume{books.length === 1 ? '' : 's'}
        </span>
        <div className="flex-1" />
        {!isMobile && (
          <div className="flex rounded-md border border-border p-0.5">
            <Button variant={view === 'card' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => setView('card')}>
              <LayoutGrid className="size-4" />Card
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => setView('list')}>
              <List className="size-4" />List
            </Button>
          </div>
        )}
      </div>
      {effectiveView === 'card' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {books.map((b) => <BookCard key={b.id} book={b} seriesId={seriesId} />)}
        </div>
      ) : (
        <BooksTable books={books} seriesId={seriesId} />
      )}
    </>
  )
}

function BooksTable({ books, seriesId }: { books: KomgaBookDto[]; seriesId: string }) {
  const mark = useMarkBook(seriesId)
  const addToList = useAddToReadList()
  if (books.length === 0) return <div className="text-sm text-muted-foreground">No volumes.</div>
  return (
    <div className="rounded-md border border-border">
      <div className={`${ROW} border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground`}>
        <span className="text-center">#</span>
        <span />
        <span>Title</span>
        <span className="text-right">Pages</span>
        <span>Released</span>
        <span>Read progress</span>
        <span />
      </div>
      {books.map((b) => {
        const st = bookReadState(b)
        const pct = b.media.pagesCount ? Math.round(((b.readProgress?.page ?? 0) / b.media.pagesCount) * 100) : 0
        const title = b.metadata.title || b.name
        return (
          <div key={b.id} className={`${ROW} border-b border-border px-4 py-2 last:border-0 hover:bg-accent`}>
            <span className={`text-center text-sm tabular-nums ${st === 'UNREAD' ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
              {b.metadata.number}
            </span>
            <a href={komgaReaderUrl(b.id)} target="_blank" rel="noreferrer" aria-label={`Read ${title}`}
               className="h-7 w-5 overflow-hidden rounded-[2px] border border-border">
              <CoverImage src={bookCoverUrl(b.id)} alt="" />
            </a>
            <a href={komgaReaderUrl(b.id)} target="_blank" rel="noreferrer"
               className={`truncate text-sm hover:underline ${st === 'UNREAD' ? 'text-foreground/80' : 'font-medium'}`}>
              {title}
            </a>
            <span className="text-right text-sm tabular-nums text-muted-foreground">{b.media.pagesCount}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{releaseYear(b.metadata.releaseDate) ?? '—'}</span>
            <span className="text-sm">
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
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`${title} actions`}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {st !== 'READ' && (
                  <DropdownMenuItem onClick={() => mark.mutate({ bookId: b.id, read: true })}>
                    <Check className="size-4" /> Mark read
                  </DropdownMenuItem>
                )}
                {st !== 'UNREAD' && (
                  <DropdownMenuItem onClick={() => mark.mutate({ bookId: b.id, read: false })}>
                    <RotateCcw className="size-4" /> Mark unread
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => addToList.mutate({ target: { type: 'book', bookId: b.id }, listId: 'default' })}>
                  <BookmarkPlus className="size-4" /> Zu „To Read"
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => triggerDownload(bookDownloadUrl(b.id))}>
                  <Download className="size-4" /> Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </div>
  )
}

function RelatedTab({ publisher, excludeId }: { publisher: string; excludeId: string }) {
  const rq = useRelatedByPublisher(publisher, excludeId)
  const related = rq.data ?? []
  if (!publisher || publisher === '—') return <div className="text-sm text-muted-foreground">No publisher on this series.</div>
  if (rq.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>
  if (related.length === 0) return <div className="text-sm text-muted-foreground">Nothing else from {publisher}.</div>
  return (
    <>
      <div className="mb-3 text-sm text-muted-foreground">More from <span className="text-foreground">{publisher}</span></div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
        {related.map((r) => <SeriesCard key={r.id} s={r} />)}
      </div>
    </>
  )
}

function MetadataTab({ dto, year, libraryName }: { dto: KomgaSeriesDto; year: string | null; libraryName: string }) {
  const m = dto.metadata
  const tags = m.tags.filter((t) => !t.startsWith('rating:') && !t.startsWith('format:'))
  const rows: [string, ReactNode][] = [
    ['Library', libraryName || '—'],
    ['Status', <StatusDot status={m.status} />],
    ['Release', year ?? '—'],
    ['Publisher', m.publisher || '—'],
    ['Author', pickAuthor(dto.booksMetadata.authors)],
    ['Language', m.language ? m.language.toUpperCase() : '—'],
    ['Age rating', m.ageRating != null ? `${m.ageRating}+` : '—'],
    ['Reading dir.', m.readingDirection ? (READING_DIR[m.readingDirection] ?? m.readingDirection) : '—'],
    ['Total books', String(m.totalBookCount ?? dto.booksCount)],
    ['Genres', m.genres.length ? m.genres.join(', ') : '—'],
    ['Tags', tags.length ? tags.join(', ') : '—'],
  ]
  return (
    <div className="max-w-2xl">
      <dl className="rounded-md border border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 border-b border-border px-4 py-2 text-sm last:border-0">
            <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 flex-1">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
