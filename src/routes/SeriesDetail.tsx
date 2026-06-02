import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, ExternalLink, Play, Check, CheckCheck, RotateCcw, MoreVertical } from 'lucide-react'
import {
  useSeries, useSeriesBooks, useRelatedByPublisher, useLibraries,
} from '@/lib/komga/queries'
import { useMarkSeries, useMarkBook } from '@/lib/komga/mutations'
import { mapSeries } from '@/lib/komga/mapping'
import { pickContinueBook, bookReadState, bookCoverUrl, releaseYear } from '@/lib/komga/books'
import { komgaReaderUrl, komgaSeriesUrl } from '@/lib/komga/reader'
import { prettyLibraryName } from '@/lib/library'
import { CoverImage } from '@/components/CoverImage'
import { Stars } from '@/components/Stars'
import { StatusDot } from '@/components/StatusDot'
import { SeriesCard } from '@/components/SeriesCard'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
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
  const markSeries = useMarkSeries()

  if (sq.isLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>
  if (sq.isError || !sq.data) return (
    <div className="p-8 text-muted-foreground">
      Couldn&apos;t load this series. <Link to="/" className="underline">Back</Link>
    </div>
  )

  const dto = sq.data
  const s = mapSeries(dto)
  const books = bq.data?.content ?? []
  const cont = pickContinueBook(books)
  const libraryName = prettyLibraryName(libs.data?.find((l) => l.id === dto.libraryId)?.name ?? '')
  const year = releaseYear(dto.booksMetadata.releaseDate)
  const done = s.progress.total > 0 && s.progress.read >= s.progress.total

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* top bar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <Link to="/" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Back to library">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {libraryName && (
            <>
              <Link to="/" className="hover:text-foreground">{libraryName}</Link>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
            </>
          )}
          <span className="truncate text-foreground">{s.title}</span>
        </div>
        <div className="flex-1" />
        <a
          href={komgaSeriesUrl(dto.id)} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ExternalLink className="size-3.5" /> Open in Komga
        </a>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* hero */}
        <div className="flex gap-7 p-6">
          <div className="w-48 shrink-0">
            <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border shadow-xl">
              <CoverImage src={s.coverUrl} alt={s.title} />
            </div>
            <div className="mt-2.5 text-center text-xs tabular-nums text-muted-foreground">
              {s.progress.total} volume{s.progress.total === 1 ? '' : 's'} · {s.progress.read} read
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{s.title}</h1>
              <StatusDot status={s.status} />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary">{s.author}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{s.publisher}</span>
              {year && (<><span className="text-muted-foreground/50">·</span><span className="tabular-nums">{year}</span></>)}
              {s.language && (<><span className="text-muted-foreground/50">·</span><span className="uppercase">{s.language}</span></>)}
            </div>

            {s.rating && (
              <div className="mt-3.5 flex items-center gap-3">
                <Stars rating={s.rating} size={18} />
                {s.goodreads && (
                  <a href={s.goodreads.url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    ★ {s.goodreads.avg} · Goodreads ({s.goodreads.votes}) <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}

            {s.genres.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {s.genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
              </div>
            )}

            {dto.metadata.summary && (
              <p className="mt-3.5 max-w-2xl text-sm leading-relaxed text-foreground/90">{dto.metadata.summary}</p>
            )}

            <div className="mt-5 flex items-center gap-2.5">
              {cont ? (
                <a href={komgaReaderUrl(cont.book.id)} target="_blank" rel="noreferrer"
                   className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                  <Play className="size-4" />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium">{cont.started ? 'Continue reading' : 'Start reading'}</span>
                    <span className="text-[11px] tabular-nums opacity-85">
                      Vol. {cont.book.metadata.number}{cont.started ? ` · p.${cont.page + 1}/${cont.pages}` : ''}
                    </span>
                  </span>
                </a>
              ) : books.length > 0 ? (
                <a href={komgaReaderUrl(books[0].id)} target="_blank" rel="noreferrer"
                   className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-accent">
                  <Check className="size-4 text-green-500" /> All read · re-read from Vol. {books[0].metadata.number}
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => markSeries.mutate({ seriesId: dto.id, read: !done })}
                disabled={markSeries.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                {done ? <RotateCcw className="size-4" /> : <CheckCheck className="size-4" />}
                {done ? 'Mark all unread' : 'Mark all read'}
              </button>
            </div>
          </div>
        </div>

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
            <BooksTable books={books} seriesId={dto.id} />
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

function BooksTable({ books, seriesId }: { books: KomgaBookDto[]; seriesId: string }) {
  const mark = useMarkBook(seriesId)
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
  const tags = m.tags.filter((t) => !t.startsWith('rating:'))
  const rows: [string, ReactNode][] = [
    ['Library', libraryName || '—'],
    ['Status', <StatusDot status={m.status} />],
    ['Release', year ?? '—'],
    ['Publisher', m.publisher || '—'],
    ['Author', s_author(dto)],
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

function s_author(dto: KomgaSeriesDto): string {
  const writer = dto.booksMetadata.authors.find((a) => a.role === 'writer')
  return writer?.name ?? dto.booksMetadata.authors[0]?.name ?? '—'
}
