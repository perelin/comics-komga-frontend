import type { KomgaBookDto, ReadStatus } from './types'

export interface ContinueTarget {
  book: KomgaBookDto
  page: number
  pages: number
  /** true = resume an in-progress book; false = start the next unread one */
  started: boolean
}

/** The book the "Continue reading" action should open: the first in-progress
 *  book, else the first unread one, else null (whole series read). */
export function pickContinueBook(books: KomgaBookDto[]): ContinueTarget | null {
  const inProgress = books.find((b) => b.readProgress && !b.readProgress.completed)
  if (inProgress) {
    return { book: inProgress, page: inProgress.readProgress!.page, pages: inProgress.media.pagesCount, started: true }
  }
  const next = books.find((b) => !b.readProgress)
  if (next) {
    return { book: next, page: 0, pages: next.media.pagesCount, started: false }
  }
  return null
}

export function bookReadState(b: KomgaBookDto): ReadStatus {
  if (b.readProgress?.completed) return 'READ'
  if (b.readProgress) return 'IN_PROGRESS'
  return 'UNREAD'
}

export function bookCoverUrl(id: string): string {
  return `/komga/api/v1/books/${id}/thumbnail`
}

/** A book's read progress as a 0–100 integer percentage. 100 if completed,
 *  0 if unread or page-less (guards divide-by-zero). */
export function bookProgressPct(b: KomgaBookDto): number {
  if (b.readProgress?.completed) return 100
  const { pagesCount } = b.media
  if (!b.readProgress || !pagesCount) return 0
  return Math.round((b.readProgress.page / pagesCount) * 100)
}

/** Total page count across every book in a series (sum of media.pagesCount). */
export function sumPages(books: KomgaBookDto[]): number {
  return books.reduce((total, b) => total + b.media.pagesCount, 0)
}

/** A page total for display: thousands-separated + a "pp" suffix, e.g. "8,340 pp". */
export function formatPages(n: number): string {
  return `${n.toLocaleString('en-US')} pp`
}

/** Display string for an overview card/row page total: the formatted count once
 *  known, an ellipsis while the lazy fetch is in flight, or a dash when the
 *  series has no books to count. */
export function pagesLabel(pages: number | undefined, booksCount: number): string {
  if (booksCount === 0) return '—'
  if (pages == null) return '…'
  return formatPages(pages)
}

/** Year out of an ISO date (or a bare year); null if absent/unparseable. */
export function releaseYear(date: string | null | undefined): string | null {
  if (!date) return null
  const m = /^(\d{4})/.exec(date)
  return m ? m[1] : null
}
