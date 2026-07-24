import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Play, Check, CheckCheck, RotateCcw } from 'lucide-react'
import { useMarkSeries } from '@/lib/komga/mutations'
import { AddToReadListButton } from '@/components/AddToReadListButton'
import { mapSeries, pickSummary } from '@/lib/komga/mapping'
import { pickContinueBook, sumPages, yearRange, bookPageUrl } from '@/lib/komga/books'
import { komgaReaderUrl } from '@/lib/komga/reader'
import { facetHref } from '@/lib/komga/filters'
import { CoverImage } from '@/components/CoverImage'
import { HeroBackdrop } from '@/components/HeroBackdrop'
import { Stars } from '@/components/Stars'
import { StatusDot } from '@/components/StatusDot'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

export function SeriesHero({ dto, books }: { dto: KomgaSeriesDto; books: KomgaBookDto[] }) {
  const s = mapSeries(dto)
  const markSeries = useMarkSeries()
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const cont = pickContinueBook(books)
  const done = s.progress.total > 0 && s.progress.read >= s.progress.total
  const years = yearRange(books)
  const pages = sumPages(books)
  const summary = pickSummary(dto)
  const hdUrl = books.length > 0 ? bookPageUrl(books[0].id, 1) : null

  // Show the Read-more toggle only when the (clamped) summary actually overflows
  // 4 lines — measured via scrollHeight vs clientHeight, not a char-count guess.
  // Skip measurement while expanded to avoid measuring the un-clamped paragraph.
  useLayoutEffect(() => {
    const el = summaryRef.current
    if (!el || expanded) return
    const measure = () => {
      setOverflows(el.scrollHeight > el.clientHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [summary?.text, expanded])

  return (
    <div className="relative" data-testid="series-hero">
      {/* Spec: no books → no backdrop at all (page looks like today). */}
      {books.length > 0 && <HeroBackdrop thumbUrl={s.coverUrl} hdUrl={hdUrl} />}
      <div className="relative flex gap-4 p-4 md:gap-7 md:p-6">
        <div className="w-28 shrink-0 md:w-48">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border shadow-xl">
            <CoverImage src={s.coverUrl} alt={s.title} />
          </div>
          <div className="mt-2.5 text-center text-xs tabular-nums text-muted-foreground hero-text-shadow">
            {s.progress.total} volume{s.progress.total === 1 ? '' : 's'} · {s.progress.read} read
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight md:text-3xl hero-text-shadow-strong">{s.title}</h1>
            <StatusDot status={s.status} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground hero-text-shadow">
            {s.authorNames.length > 0 ? (
              <Link to={facetHref({ authors: [s.authorNames[0]] })} className="text-primary hover:underline">{s.author}</Link>
            ) : (
              <span className="text-primary">{s.author}</span>
            )}
            <span className="text-muted-foreground/50">·</span>
            {s.publisher && s.publisher !== '—' ? (
              <Link to={facetHref({ publisher: [s.publisher] })} className="hover:text-foreground hover:underline">{s.publisher}</Link>
            ) : (
              <span>{s.publisher}</span>
            )}
            {years && (<><span className="text-muted-foreground/50">·</span><span className="tabular-nums">{years}</span></>)}
            {pages > 0 && (<><span className="text-muted-foreground/50">·</span><span className="tabular-nums">{pages.toLocaleString('en-US')} pages</span></>)}
            {s.language && (<><span className="text-muted-foreground/50">·</span><span className="uppercase">{s.language}</span></>)}
          </div>

          {s.rating && (
            <div className="mt-3.5 flex items-center gap-3">
              <Stars rating={s.rating} size={18} />
            </div>
          )}

          {dto.metadata.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dto.metadata.links.map((l) => (
                <a
                  key={l.url} href={l.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-foreground/25 bg-background/50 px-3 py-1 text-xs font-medium text-foreground hover:bg-background/70"
                >
                  {l.label} <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          )}

          {/* Genres live in SeriesMetaBand, with the tags and as clickable
              facet links — the hero used to duplicate them. */}

          {summary && (
            <div className="mt-3.5 max-w-2xl">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground hero-text-shadow">
                Summary{summary.fromBook ? ` · from Vol. ${summary.fromBook}` : ''}
              </div>
              <p
                ref={summaryRef}
                className={`mt-1 text-sm leading-relaxed text-foreground/95 hero-text-shadow ${expanded ? '' : 'line-clamp-4'}`}
              >
                {summary.text}
              </p>
              {(overflows || expanded) && (
                <button
                  type="button" onClick={() => setExpanded((e) => !e)}
                  className="mt-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? 'Show less ▴' : 'Read more ▾'}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5 md:mt-5">
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
                 className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/45 px-4 text-sm hover:bg-accent">
                <Check className="size-4 text-green-500" /> All read · re-read from Vol. {books[0].metadata.number}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => markSeries.mutate({ seriesId: dto.id, read: !done })}
              disabled={markSeries.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/45 px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {done ? <RotateCcw className="size-4" /> : <CheckCheck className="size-4" />}
              {done ? 'Mark all unread' : 'Mark all read'}
            </button>
            <AddToReadListButton
              target={{ type: 'series', seriesId: dto.id }}
              label="Zu Liste"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/45 px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
