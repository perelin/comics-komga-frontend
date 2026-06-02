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

/** Year out of an ISO date (or a bare year); null if absent/unparseable. */
export function releaseYear(date: string | null | undefined): string | null {
  if (!date) return null
  const m = /^(\d{4})/.exec(date)
  return m ? m[1] : null
}
