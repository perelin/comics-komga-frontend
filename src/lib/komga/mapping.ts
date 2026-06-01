import type { KomgaAuthor, KomgaWebLink, KomgaSeriesDto, SeriesStatus } from './types'

export interface Rating { value: number; needsCheck: boolean }
export interface Goodreads { avg: number; votes: string; url: string }

export interface SeriesVM {
  id: string
  title: string
  author: string
  publisher: string
  status: SeriesStatus
  genres: string[]
  language: string
  ageRating: number | null
  oneshot: boolean
  progress: { read: number; inProgress: number; unread: number; total: number }
  rating?: Rating
  goodreads?: Goodreads
  coverUrl: string
}

const RATING_RE = /^rating:(\d(?:\.\d)?)$/
export function parseRating(tags: string[]): Rating | undefined {
  const needsCheck = tags.includes('rating:check')
  for (const t of tags) {
    const m = RATING_RE.exec(t)
    if (m) return { value: parseFloat(m[1]), needsCheck }
  }
  return undefined
}

const GR_RE = /([\d.]+)\s*·\s*Goodreads\s*\(([^)]+)\)/
export function parseGoodreads(links: KomgaWebLink[]): Goodreads | undefined {
  const link = links.find((l) => l.label.includes('Goodreads'))
  if (!link) return undefined
  const m = GR_RE.exec(link.label)
  if (!m) return undefined
  const avg = parseFloat(m[1])
  return Number.isNaN(avg) ? undefined : { avg, votes: m[2], url: link.url }
}

export function pickAuthor(authors: KomgaAuthor[]): string {
  const writer = authors.find((a) => a.role === 'writer')
  return writer?.name ?? authors[0]?.name ?? '—'
}

export function mapSeries(dto: KomgaSeriesDto): SeriesVM {
  return {
    id: dto.id,
    title: dto.metadata.title || dto.name,
    author: pickAuthor(dto.booksMetadata.authors),
    publisher: dto.metadata.publisher || '—',
    status: dto.metadata.status,
    genres: dto.metadata.genres,
    language: dto.metadata.language,
    ageRating: dto.metadata.ageRating,
    oneshot: dto.oneshot,
    progress: {
      read: dto.booksReadCount,
      inProgress: dto.booksInProgressCount,
      unread: dto.booksUnreadCount,
      total: dto.booksCount,
    },
    rating: parseRating(dto.metadata.tags),
    goodreads: parseGoodreads(dto.metadata.links),
    coverUrl: `/komga/api/v1/series/${dto.id}/thumbnail`,
  }
}
