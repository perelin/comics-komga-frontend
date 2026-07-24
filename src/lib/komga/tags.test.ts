import { describe, it, expect } from 'vitest'
import { allTags, tagHref } from './tags'
import type { KomgaSeriesDto } from './types'

function dto(seriesTags: string[], bookTags: string[] = []): KomgaSeriesDto {
  return {
    id: 's1', libraryId: 'lib1', name: 'S', oneshot: false,
    booksCount: 1, booksReadCount: 0, booksUnreadCount: 1, booksInProgressCount: 0,
    metadata: {
      status: 'ONGOING', title: 'S', titleSort: 'S', summary: '', publisher: '',
      genres: [], tags: seriesTags, links: [], ageRating: null, language: '',
      readingDirection: '', totalBookCount: 1,
    },
    booksMetadata: { authors: [], releaseDate: null, tags: bookTags, summary: '', summaryNumber: '' },
    created: '', lastModified: '',
  }
}

describe('allTags', () => {
  it('unions series and book tags, deduped', () => {
    expect(allTags(dto(['star trek', 'variant cover'], ['variant cover', 'time travel'])))
      .toEqual(['star trek', 'time travel', 'variant cover'])
  })

  it('keeps the convention tags — they are often the only tags a series has', () => {
    expect(allTags(dto(['format:mixed', 'rating:nomatch', 'format:singles'])))
      .toEqual(['format:mixed', 'format:singles', 'rating:nomatch'])
  })

  it('orders format, then rating, then free-form tags, alphabetical within each', () => {
    expect(allTags(dto(['zeta', 'rating:3.45', 'format:tpb', 'alpha'])))
      .toEqual(['format:tpb', 'rating:3.45', 'alpha', 'zeta'])
  })

  it('is empty for an untagged series', () => {
    expect(allTags(dto([]))).toEqual([])
  })
})

describe('tagHref', () => {
  it('links a primary format tag to its format facet', () => {
    expect(tagHref('format:singles')).toBe('/?format=singles')
    expect(tagHref('format:tpb')).toBe('/?format=tpb')
  })

  it('links format:mixed to the cleanup list, not to a format facet', () => {
    expect(tagHref('format:mixed')).toBe('/?mixed=true')
  })

  it('does not link an unknown format kind', () => {
    expect(tagHref('format:bogus')).toBeUndefined()
  })

  it('does not link rating tags — non-numeric buckets have no expressible bound', () => {
    expect(tagHref('rating:nomatch')).toBeUndefined()
    expect(tagHref('rating:check')).toBeUndefined()
    expect(tagHref('rating:3.45')).toBeUndefined()
  })

  it('does not link free-form tags — there is no tag facet', () => {
    expect(tagHref('star trek')).toBeUndefined()
  })
})
