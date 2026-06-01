import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Check } from 'lucide-react'
import { useSeries, useSeriesBooks } from '@/lib/komga/queries'
import { mapSeries } from '@/lib/komga/mapping'
import { CoverImage } from '@/components/CoverImage'
import { Stars } from '@/components/Stars'
import { StatusDot } from '@/components/StatusDot'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function SeriesDetail() {
  const { id = '' } = useParams()
  const sq = useSeries(id)
  const bq = useSeriesBooks(id)

  if (sq.isLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>
  if (sq.isError || !sq.data) return (
    <div className="p-8 text-muted-foreground">
      Couldn&apos;t load this series. <Link to="/" className="underline">Back</Link>
    </div>
  )

  const s = mapSeries(sq.data)
  const summary = sq.data.metadata.summary
  const books = bq.data?.content ?? []

  return (
    <div className="h-screen overflow-auto bg-background text-foreground">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Link to="/" className="rounded-md p-1.5 hover:bg-accent">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="text-sm text-muted-foreground">{s.title}</span>
      </div>
      <div className="flex gap-8 p-8">
        <div className="w-48 shrink-0">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border shadow-xl">
            <CoverImage src={s.coverUrl} alt={s.title} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{s.title}</h1>
            <StatusDot status={s.status} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <span className="text-primary">{s.author}</span>
            <span>·</span>
            <span>{s.publisher}</span>
          </div>
          {s.rating && (
            <div className="mt-3 flex items-center gap-3">
              <Stars rating={s.rating} size={18} />
              {s.goodreads && (
                <a
                  href={s.goodreads.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  ★ {s.goodreads.avg} · Goodreads ({s.goodreads.votes}){' '}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.genres.map((g) => (
              <Badge key={g} variant="secondary">{g}</Badge>
            ))}
          </div>
          {summary && (
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">{summary}</p>
          )}
        </div>
      </div>
      <div className="px-8 pb-12">
        <div className="mb-2 text-sm font-semibold">
          Volumes <span className="text-muted-foreground">{books.length}</span>
        </div>
        <div className="rounded-md border border-border">
          {books.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0"
            >
              <span className="w-10 tabular-nums text-sm text-muted-foreground">
                {b.metadata.number}
              </span>
              <span className="flex-1 truncate">{b.metadata.title || b.name}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {b.media.pagesCount}p
              </span>
              {b.readProgress?.completed ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-500">
                  <Check className="size-3.5" />Read
                </span>
              ) : b.readProgress ? (
                <span className="text-sm text-primary">In progress</span>
              ) : (
                <span className="text-sm text-muted-foreground/50">Unread</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
