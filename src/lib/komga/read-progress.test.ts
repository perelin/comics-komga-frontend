import { describe, it, expect } from 'vitest'
import {
  setBookRead, setAllBooksRead, recountSeries, setSeriesCounts, setSeriesInPage,
} from './read-progress'
import type { KomgaBookDto, KomgaSeriesDto, KomgaPage } from './types'

type RP = KomgaBookDto['readProgress']

function book(id: string, rp: RP = null, pages = 20): KomgaBookDto {
  return {
    id, seriesId: 's1', seriesTitle: 'Series', name: id,
    media: { pagesCount: pages },
    metadata: { title: id, number: id, numberSort: 1, releaseDate: null, summary: '' },
    readProgress: rp,
  }
}

function booksPage(books: KomgaBookDto[]): KomgaPage<KomgaBookDto> {
  return { content: books, totalElements: books.length, totalPages: 1, number: 0, size: books.length, first: true, last: true }
}

function series(over: Partial<KomgaSeriesDto> = {}): KomgaSeriesDto {
  return {
    id: 's1', libraryId: 'l1', name: 'S', oneshot: false,
    booksCount: 3, booksReadCount: 0, booksUnreadCount: 3, booksInProgressCount: 0,
    metadata: {
      status: 'ONGOING', title: 'S', titleSort: 'S', summary: '', publisher: '',
      genres: [], tags: [], links: [], ageRating: null, language: '', readingDirection: '', totalBookCount: 3,
    },
    booksMetadata: { authors: [], releaseDate: null, tags: [] }, created: '', lastModified: '',
    ...over,
  }
}

const seriesPage = (list: KomgaSeriesDto[]): KomgaPage<KomgaSeriesDto> => ({
  content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true,
})

describe('setBookRead', () => {
  it('marks the target book completed at the last page', () => {
    const page = booksPage([book('a'), book('b')])
    const next = setBookRead(page, 'b', true)
    expect(next.content[1].readProgress).toEqual({ page: 20, completed: true, readDate: '' })
  })
  it('marks the target book unread (readProgress null)', () => {
    const page = booksPage([book('a', { page: 20, completed: true, readDate: 'x' })])
    expect(setBookRead(page, 'a', false).content[0].readProgress).toBeNull()
  })
  it('leaves other books untouched', () => {
    const page = booksPage([book('a'), book('b')])
    expect(setBookRead(page, 'b', true).content[0].readProgress).toBeNull()
  })
  it('is a no-op when the book is not in the page', () => {
    const page = booksPage([book('a')])
    expect(setBookRead(page, 'zzz', true).content[0].readProgress).toBeNull()
  })
  it('does not mutate the input page', () => {
    const page = booksPage([book('a')])
    const next = setBookRead(page, 'a', true)
    expect(next).not.toBe(page)
    expect(page.content[0].readProgress).toBeNull()
  })
})

describe('setAllBooksRead', () => {
  it('marks every book completed', () => {
    const page = booksPage([book('a'), book('b', { page: 5, completed: false, readDate: 'x' })])
    const next = setAllBooksRead(page, true)
    expect(next.content.every((b) => b.readProgress?.completed)).toBe(true)
  })
  it('clears progress on every book when unread', () => {
    const page = booksPage([book('a', { page: 20, completed: true, readDate: 'x' }), book('b')])
    const next = setAllBooksRead(page, false)
    expect(next.content.every((b) => b.readProgress === null)).toBe(true)
  })
})

describe('recountSeries', () => {
  it('derives read/in-progress/unread counts from the books', () => {
    const books = [
      book('a', { page: 20, completed: true, readDate: 'x' }),
      book('b', { page: 5, completed: false, readDate: 'x' }),
      book('c'),
    ]
    const next = recountSeries(series(), books)
    expect(next).toMatchObject({ booksReadCount: 1, booksInProgressCount: 1, booksUnreadCount: 1 })
  })
  it('keeps booksCount unchanged', () => {
    expect(recountSeries(series({ booksCount: 3 }), []).booksCount).toBe(3)
  })
})

describe('setSeriesCounts', () => {
  it('marks all read: read=total, others 0', () => {
    expect(setSeriesCounts(series({ booksCount: 11 }), true)).toMatchObject({
      booksReadCount: 11, booksUnreadCount: 0, booksInProgressCount: 0,
    })
  })
  it('marks all unread: unread=total, others 0', () => {
    expect(setSeriesCounts(series({ booksCount: 11, booksReadCount: 11, booksUnreadCount: 0 }), false)).toMatchObject({
      booksReadCount: 0, booksUnreadCount: 11, booksInProgressCount: 0,
    })
  })
})

describe('setSeriesInPage', () => {
  it('updates only the matching series in a list page', () => {
    const page = seriesPage([series({ id: 's1', booksCount: 4 }), series({ id: 's2', booksCount: 9 })])
    const next = setSeriesInPage(page, 's2', true)
    expect(next.content[0].booksReadCount).toBe(0)
    expect(next.content[1].booksReadCount).toBe(9)
  })
})
