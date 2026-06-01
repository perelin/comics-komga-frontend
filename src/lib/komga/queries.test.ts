import { describe, it, expect } from 'vitest'
import { nextPageParam, flattenSeries, totalSeries } from './queries'
import type { KomgaPage, KomgaSeriesDto } from './types'

const page = (n: number, last: boolean): KomgaPage<KomgaSeriesDto> => ({
  content: [], totalElements: 100, totalPages: 2, number: n, size: 50, first: n === 0, last,
})

describe('nextPageParam', () => {
  it('returns the next page number when not last', () => {
    expect(nextPageParam(page(0, false))).toBe(1)
  })
  it('returns undefined on the last page', () => {
    expect(nextPageParam(page(1, true))).toBeUndefined()
  })
})

describe('flatten/total helpers', () => {
  const dto = (id: string): KomgaSeriesDto => ({
    id, libraryId: 'l', name: id, oneshot: false,
    booksCount: 1, booksReadCount: 0, booksUnreadCount: 1, booksInProgressCount: 0,
    metadata: { status: 'ONGOING', title: id, titleSort: id, summary: '', publisher: '', genres: [], tags: [], links: [], ageRating: null, language: '', readingDirection: '', totalBookCount: 1 },
    booksMetadata: { authors: [], releaseDate: null, tags: [] }, created: '', lastModified: '',
  })
  const data = { pages: [{ ...page(0, true), content: [dto('a'), dto('b')], totalElements: 2 }], pageParams: [0] }
  it('flattens all pages into view models', () => {
    expect(flattenSeries(data).map((s) => s.id)).toEqual(['a', 'b'])
  })
  it('reads total from the first page', () => {
    expect(totalSeries(data)).toBe(2)
  })
  it('handles undefined data', () => {
    expect(flattenSeries(undefined)).toEqual([])
    expect(totalSeries(undefined)).toBe(0)
  })
})
