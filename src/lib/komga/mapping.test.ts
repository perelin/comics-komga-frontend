import { describe, it, expect } from 'vitest'
import { parseRating, parseGoodreads, pickAuthor, mapSeries } from './mapping'
import type { KomgaSeriesDto } from './types'

describe('parseRating', () => {
  it('parses a rating tag to a 0-5 number', () => {
    expect(parseRating(['rating:4.2'])).toEqual({ value: 4.2, needsCheck: false })
  })
  it('parses a two-decimal (0.05-step) rating tag', () => {
    expect(parseRating(['rating:4.15'])).toEqual({ value: 4.15, needsCheck: false })
  })
  it('flags low-confidence when rating:check present', () => {
    expect(parseRating(['rating:check', 'rating:4.2'])).toEqual({ value: 4.2, needsCheck: true })
  })
  it('returns undefined when no rating tag', () => {
    expect(parseRating(['scifi'])).toBeUndefined()
  })
  it('ignores rating:check alone (no numeric rating)', () => {
    expect(parseRating(['rating:check'])).toBeUndefined()
  })
})

describe('parseGoodreads', () => {
  it('parses avg + votes + url from the label', () => {
    expect(parseGoodreads([{ label: '★ 4.13 · Goodreads (106)', url: 'https://www.goodreads.com/book/show/1' }]))
      .toEqual({ avg: 4.13, votes: '106', url: 'https://www.goodreads.com/book/show/1' })
  })
  it('handles abbreviated vote counts', () => {
    expect(parseGoodreads([{ label: '★ 4.20 · Goodreads (367k)', url: 'u' }]))
      .toEqual({ avg: 4.2, votes: '367k', url: 'u' })
  })
  it('returns undefined when no goodreads link', () => {
    expect(parseGoodreads([{ label: 'Wikipedia', url: 'w' }])).toBeUndefined()
  })
  it('returns undefined when a Goodreads label has no parseable score', () => {
    expect(parseGoodreads([{ label: 'See on Goodreads', url: 'u' }])).toBeUndefined()
  })
})

describe('pickAuthor', () => {
  it('prefers the writer role', () => {
    expect(pickAuthor([{ name: 'Ed', role: 'editor' }, { name: 'Bri', role: 'writer' }])).toBe('Bri')
  })
  it('falls back to the first author', () => {
    expect(pickAuthor([{ name: 'Ed', role: 'editor' }])).toBe('Ed')
  })
  it('returns a dash when empty', () => {
    expect(pickAuthor([])).toBe('—')
  })
})

describe('mapSeries', () => {
  const dto: KomgaSeriesDto = {
    id: 's1', libraryId: 'l1', name: 'Saga (raw)', oneshot: false,
    booksCount: 11, booksReadCount: 7, booksUnreadCount: 3, booksInProgressCount: 1,
    metadata: {
      status: 'ONGOING', title: 'Saga', titleSort: 'Saga', summary: 's',
      publisher: 'Image', genres: ['Science Fiction'], tags: ['rating:4.2'],
      links: [{ label: '★ 4.13 · Goodreads (106)', url: 'g' }],
      ageRating: 16, language: 'en', readingDirection: 'LTR', totalBookCount: 11,
    },
    booksMetadata: { authors: [{ name: 'BKV', role: 'writer' }], releaseDate: '2012-03-14', tags: [] },
    created: '', lastModified: '',
  }
  it('maps the full view model', () => {
    const vm = mapSeries(dto)
    expect(vm).toMatchObject({
      id: 's1', title: 'Saga', author: 'BKV', publisher: 'Image', status: 'ONGOING',
      genres: ['Science Fiction'], oneshot: false,
      progress: { read: 7, inProgress: 1, unread: 3, total: 11 },
      rating: { value: 4.2, needsCheck: false },
      goodreads: { avg: 4.13, votes: '106', url: 'g' },
      coverUrl: '/komga/api/v1/series/s1/thumbnail',
    })
  })
  it('derives the release year from the first book (booksMetadata.releaseDate)', () => {
    expect(mapSeries(dto).year).toBe('2012')
  })
  it('leaves year null when there is no release date', () => {
    expect(mapSeries({ ...dto, booksMetadata: { ...dto.booksMetadata, releaseDate: null } }).year).toBeNull()
  })
})
