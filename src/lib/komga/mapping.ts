import type { KomgaAuthor, KomgaSeriesDto, SeriesStatus } from './types'
import type { Progress } from './progress'
import { releaseYear } from './books'
import { parseFormat, type Format } from './format'

export interface Rating { value: number; needsCheck: boolean }

export interface SeriesVM {
  id: string
  title: string
  /** Display string for the writer credit: "A", "A, B", "A, B +1", or "—". */
  author: string
  /** Underlying writer names (fallback: first credited author), for facet links. */
  authorNames: string[]
  publisher: string
  status: SeriesStatus
  genres: string[]
  language: string
  ageRating: number | null
  oneshot: boolean
  progress: Progress
  rating?: Rating
  /** Primary publication format from the format:* tag convention; undefined = untagged. */
  format?: Format
  coverUrl: string
  /** Release year of the first book in the stack (booksMetadata.releaseDate). */
  year: string | null
}

// One or two decimals: old 0.2-step tags (rating:4.2) and new 0.05-step tags (rating:4.15).
const RATING_RE = /^rating:(\d(?:\.\d{1,2})?)$/
export function parseRating(tags: string[]): Rating | undefined {
  const needsCheck = tags.includes('rating:check')
  for (const t of tags) {
    const m = RATING_RE.exec(t)
    if (m) return { value: parseFloat(m[1]), needsCheck }
  }
  return undefined
}

/** Writer names in DTO order; falls back to the first credited author of any
 *  role so a series that only tags e.g. a penciller still shows a name. */
export function writerNames(authors: KomgaAuthor[]): string[] {
  const writers = creditNames(authors, 'writer')
  if (writers.length > 0) return writers
  return authors[0] ? [authors[0].name] : []
}

/** Display credit for the writer(s): all writers, at most two, rest as +N. */
export function pickAuthor(authors: KomgaAuthor[]): string {
  return formatCredit(writerNames(authors), 2) ?? '—'
}

export function mapSeries(dto: KomgaSeriesDto): SeriesVM {
  return {
    id: dto.id,
    title: dto.metadata.title || dto.name,
    author: pickAuthor(dto.booksMetadata.authors),
    authorNames: writerNames(dto.booksMetadata.authors),
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
    format: parseFormat(dto.metadata.tags),
    coverUrl: `/komga/api/v1/series/${dto.id}/thumbnail`,
    year: releaseYear(dto.booksMetadata.releaseDate),
  }
}

export interface SummaryPick { text: string; fromBook: string | null }

/** The summary to show on Series Detail: the series' own, else Komga's
 *  first-book fallback (with the source book's number for the label). */
export function pickSummary(dto: KomgaSeriesDto): SummaryPick | null {
  if (dto.metadata.summary) return { text: dto.metadata.summary, fromBook: null }
  const bm = dto.booksMetadata
  if (bm.summary) return { text: bm.summary, fromBook: bm.summaryNumber || null }
  return null
}

/** All author names credited with a given role, in DTO order. */
export function creditNames(authors: KomgaAuthor[], role: string): string[] {
  return authors.filter((a) => a.role === role).map((a) => a.name)
}

/** "A", "A, B" or "A, B +1" — at most `max` names, the rest collapsed. */
export function formatCredit(names: string[], max = 2): string | null {
  if (names.length === 0) return null
  const shown = names.slice(0, max).join(', ')
  const extra = names.length - max
  return extra > 0 ? `${shown} +${extra}` : shown
}
