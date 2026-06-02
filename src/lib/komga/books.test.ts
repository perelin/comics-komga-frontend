import { describe, it, expect } from 'vitest'
import { pickContinueBook, bookReadState, releaseYear, bookCoverUrl, bookProgressPct } from './books'
import type { KomgaBookDto } from './types'

function book(n: number, progress: KomgaBookDto['readProgress'], pages = 100): KomgaBookDto {
  return {
    id: `b${n}`,
    seriesId: 's1',
    name: `Vol ${n}`,
    media: { pagesCount: pages },
    metadata: { title: `Volume ${n}`, number: String(n), numberSort: n, releaseDate: '2008-04-30', summary: '' },
    readProgress: progress,
  }
}
const read = (n: number) => book(n, { page: 100, completed: true, readDate: '2026-01-01' })
const inProgress = (n: number, page: number) => book(n, { page, completed: false, readDate: '2026-01-01' })
const unread = (n: number) => book(n, null)

describe('pickContinueBook', () => {
  it('resumes the first in-progress book, reporting its page', () => {
    const t = pickContinueBook([read(1), inProgress(2, 42), unread(3)])
    expect(t).toEqual({ book: expect.objectContaining({ id: 'b2' }), page: 42, pages: 100, started: true })
  })

  it('falls back to the first unread book when nothing is in progress', () => {
    const t = pickContinueBook([read(1), read(2), unread(3), unread(4)])
    expect(t).toMatchObject({ book: expect.objectContaining({ id: 'b3' }), page: 0, started: false })
  })

  it('returns null when every book is read', () => {
    expect(pickContinueBook([read(1), read(2)])).toBeNull()
  })

  it('returns null for an empty series', () => {
    expect(pickContinueBook([])).toBeNull()
  })
})

describe('bookReadState', () => {
  it('classifies read / in-progress / unread', () => {
    expect(bookReadState(read(1))).toBe('READ')
    expect(bookReadState(inProgress(1, 10))).toBe('IN_PROGRESS')
    expect(bookReadState(unread(1))).toBe('UNREAD')
  })
})

describe('releaseYear', () => {
  it('extracts the year from an ISO date', () => {
    expect(releaseYear('2008-04-30')).toBe('2008')
  })
  it('passes through a bare year', () => {
    expect(releaseYear('1999')).toBe('1999')
  })
  it('returns null for empty or missing dates', () => {
    expect(releaseYear('')).toBeNull()
    expect(releaseYear(null)).toBeNull()
    expect(releaseYear(undefined)).toBeNull()
  })
})

describe('bookCoverUrl', () => {
  it('points at the proxied book thumbnail path', () => {
    expect(bookCoverUrl('b1')).toBe('/komga/api/v1/books/b1/thumbnail')
  })
})

describe('bookProgressPct', () => {
  it('returns the rounded read percentage for an in-progress book', () => {
    expect(bookProgressPct(inProgress(1, 42))).toBe(42)
    expect(bookProgressPct(book(1, { page: 2, completed: false, readDate: '' }, 3))).toBe(67)
  })
  it('is 100 for a read book and 0 for an unread one', () => {
    expect(bookProgressPct(read(1))).toBe(100)
    expect(bookProgressPct(unread(1))).toBe(0)
  })
  it('is 0 when the book has no pages (no divide-by-zero)', () => {
    expect(bookProgressPct(book(1, { page: 0, completed: false, readDate: '' }, 0))).toBe(0)
  })
})
