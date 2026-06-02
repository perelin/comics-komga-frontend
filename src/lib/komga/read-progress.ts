import type { KomgaBookDto, KomgaSeriesDto, KomgaPage } from './types'

/** Optimistic read-progress for a freshly-marked-read book. The real `readDate`
 *  arrives on the next refetch; `page` at the last page + `completed` is all the
 *  UI reads (see `bookReadState` / `pickContinueBook`). */
function readProgressFor(book: KomgaBookDto): KomgaBookDto['readProgress'] {
  return { page: book.media.pagesCount, completed: true, readDate: '' }
}

/** Set one book's read state within a books page (immutable). No-op if absent. */
export function setBookRead(
  page: KomgaPage<KomgaBookDto>,
  bookId: string,
  read: boolean,
): KomgaPage<KomgaBookDto> {
  return {
    ...page,
    content: page.content.map((b) =>
      b.id === bookId ? { ...b, readProgress: read ? readProgressFor(b) : null } : b,
    ),
  }
}

/** Set every book's read state within a books page (immutable). */
export function setAllBooksRead(page: KomgaPage<KomgaBookDto>, read: boolean): KomgaPage<KomgaBookDto> {
  return {
    ...page,
    content: page.content.map((b) => ({ ...b, readProgress: read ? readProgressFor(b) : null })),
  }
}

/** Recompute a series' read/in-progress/unread counts from its books (immutable). */
export function recountSeries(dto: KomgaSeriesDto, books: KomgaBookDto[]): KomgaSeriesDto {
  let read = 0
  let inProgress = 0
  let unread = 0
  for (const b of books) {
    if (b.readProgress?.completed) read++
    else if (b.readProgress) inProgress++
    else unread++
  }
  return { ...dto, booksReadCount: read, booksInProgressCount: inProgress, booksUnreadCount: unread }
}

/** Set a series' counts wholesale for a "mark all read/unread" action (immutable). */
export function setSeriesCounts(dto: KomgaSeriesDto, read: boolean): KomgaSeriesDto {
  return read
    ? { ...dto, booksReadCount: dto.booksCount, booksUnreadCount: 0, booksInProgressCount: 0 }
    : { ...dto, booksReadCount: 0, booksUnreadCount: dto.booksCount, booksInProgressCount: 0 }
}

/** Update one series' counts inside a series-list page, leaving others untouched (immutable). */
export function setSeriesInPage(
  page: KomgaPage<KomgaSeriesDto>,
  seriesId: string,
  read: boolean,
): KomgaPage<KomgaSeriesDto> {
  return {
    ...page,
    content: page.content.map((s) => (s.id === seriesId ? setSeriesCounts(s, read) : s)),
  }
}
