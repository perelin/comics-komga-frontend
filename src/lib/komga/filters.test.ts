import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTERS, filtersToSearchParams, searchParamsToFilters, filtersToKomgaParams,
  type Filters,
} from './filters'

describe('URL <-> Filters round-trip', () => {
  it('defaults produce empty search params', () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe('')
  })
  it('round-trips a populated filter set', () => {
    const f: Filters = {
      ...DEFAULT_FILTERS,
      readStatus: ['UNREAD'], genre: ['Science Fiction', 'Noir'],
      libraryId: ['lib1'], publisher: ['Image'], status: ['ONGOING'],
      ageRating: ['16'], oneshot: false, search: 'incal',
      sortKey: 'createdDate', sortDir: 'desc',
    }
    const sp = filtersToSearchParams(f)
    expect(searchParamsToFilters(sp)).toEqual(f)
  })
  it('parses empty params back to defaults', () => {
    expect(searchParamsToFilters(new URLSearchParams(''))).toEqual(DEFAULT_FILTERS)
  })
})

describe('filtersToKomgaParams', () => {
  it('maps fields to komga query params with OR-within-field', () => {
    const f: Filters = { ...DEFAULT_FILTERS, genre: ['Science Fiction', 'Noir'], readStatus: ['UNREAD'] }
    const p = filtersToKomgaParams(f, 0, 50)
    expect(p.get('genre')).toBe('Science Fiction,Noir')
    expect(p.get('read_status')).toBe('UNREAD')
    expect(p.get('page')).toBe('0')
    expect(p.get('size')).toBe('50')
    expect(p.get('sort')).toBe('metadata.titleSort,asc')
  })
  it('maps the title sort key to metadata.titleSort and passes others through', () => {
    expect(filtersToKomgaParams({ ...DEFAULT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' }, 1, 50).get('sort'))
      .toBe('createdDate,desc')
  })
  it('includes oneshot only when defined', () => {
    expect(filtersToKomgaParams(DEFAULT_FILTERS, 0, 50).has('oneshot')).toBe(false)
    expect(filtersToKomgaParams({ ...DEFAULT_FILTERS, oneshot: true }, 0, 50).get('oneshot')).toBe('true')
  })
})
