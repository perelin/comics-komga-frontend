import { describe, it, expect } from 'vitest'
import { pickContinueBook, bookReadState, releaseYear, bookCoverUrl, bookProgressPct, sumPages, formatPages, pagesLabel, bookPageUrl, yearRange, formatIndicator } from './books'
import type { KomgaBookDto } from './types'

function book(n: number, progress: KomgaBookDto['readProgress'], pages = 100): KomgaBookDto {
  return {
    id: `b${n}`,
    seriesId: 's1',
    seriesTitle: 'Series',
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

describe('sumPages', () => {
  it('sums media.pagesCount across all books', () => {
    expect(sumPages([book(1, null, 30), book(2, null, 28), book(3, null, 29)])).toBe(87)
  })
  it('is 0 for an empty series', () => {
    expect(sumPages([])).toBe(0)
  })
})

describe('formatPages', () => {
  it('formats with a thousands separator and a pp suffix', () => {
    expect(formatPages(8340)).toBe('8,340 pp')
  })
  it('formats small counts without a separator', () => {
    expect(formatPages(30)).toBe('30 pp')
  })
})

describe('pagesLabel', () => {
  it('formats a known page total', () => {
    expect(pagesLabel(8340, 11)).toBe('8,340 pp')
  })
  it('shows an ellipsis while pages are still loading', () => {
    expect(pagesLabel(undefined, 11)).toBe('…')
  })
  it('shows a dash for a series with no books', () => {
    expect(pagesLabel(undefined, 0)).toBe('—')
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

describe('bookPageUrl', () => {
  it('builds the proxied full-page URL', () => {
    expect(bookPageUrl('b1', 1)).toBe('/komga/api/v1/books/b1/pages/1')
  })
})

describe('yearRange', () => {
  const at = (n: number, date: string | null) => {
    const b = book(n, null)
    return { ...b, metadata: { ...b.metadata, releaseDate: date } }
  }
  it('spans min–max with an en dash', () => {
    expect(yearRange([at(1, '2010-08-01'), at(2, '2011-02-01'), at(3, '2010-11-01')])).toBe('2010–2011')
  })
  it('collapses a single year', () => {
    expect(yearRange([at(1, '2010-08-01'), at(2, '2010-11-01')])).toBe('2010')
  })
  it('ignores dateless books; null when none have dates', () => {
    expect(yearRange([at(1, null), at(2, '2010-11-01')])).toBe('2010')
    expect(yearRange([at(1, null)])).toBeNull()
    expect(yearRange([])).toBeNull()
  })
})

describe('formatIndicator', () => {
  it('classifies floppies by average pages', () => {
    expect(formatIndicator(111, 4)).toBe('4 issues · ⌀ 28 p. · Floppies')
  })
  it('classifies a single TPB with its absolute page count', () => {
    expect(formatIndicator(180, 1)).toBe('1 volume · 180 p. · TPB')
  })
  it('classifies omnibi', () => {
    expect(formatIndicator(1200, 2)).toBe('2 volumes · ⌀ 600 p. · Omnibus')
  })
  it('is null without books or pages', () => {
    expect(formatIndicator(0, 0)).toBeNull()
    expect(formatIndicator(0, 3)).toBeNull()
  })
  it('prefers the format:* tag over the page heuristic (kind + noun)', () => {
    // 28 p./book would guess Floppies; the curated tag wins.
    expect(formatIndicator(111, 4, { kind: 'tpb', mixed: false })).toBe('4 volumes · ⌀ 28 p. · TPB')
    expect(formatIndicator(111, 4, { kind: 'singles', mixed: false })).toBe('4 issues · ⌀ 28 p. · Singles')
    expect(formatIndicator(120, 1, { kind: 'ogn', mixed: false })).toBe('1 book · 120 p. · OGN')
  })
  it('appends the mixed data-quality flag', () => {
    expect(formatIndicator(300, 5, { kind: 'singles', mixed: true })).toBe('5 issues · ⌀ 60 p. · Singles · mixed')
  })
})
