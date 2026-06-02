import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTERS, filtersToSearchParams, searchParamsToFilters, filtersToKomgaParams,
  filtersToCondition, listQueryParams,
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
  it('round-trips the authors facet', () => {
    const f: Filters = { ...DEFAULT_FILTERS, authors: ['Neil Gaiman', 'Dave McKean'] }
    expect(searchParamsToFilters(filtersToSearchParams(f))).toEqual(f)
  })
  it('defaults include an empty authors array', () => {
    expect(DEFAULT_FILTERS.authors).toEqual([])
  })
})

describe('filtersToCondition', () => {
  it('empty filters → no condition, no fullTextSearch', () => {
    expect(filtersToCondition(DEFAULT_FILTERS)).toEqual({})
  })
  it('single facet value → bare node (no anyOf wrapper)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, readStatus: ['UNREAD'] }))
      .toEqual({ condition: { readStatus: { operator: 'is', value: 'UNREAD' } } })
  })
  it('multi-value facet → anyOf (OR within)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, genre: ['action', 'noir'] }))
      .toEqual({ condition: { anyOf: [
        { genre: { operator: 'is', value: 'action' } },
        { genre: { operator: 'is', value: 'noir' } },
      ] } })
  })
  it('maps status → seriesStatus and ageRating → numeric value', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, status: ['ONGOING'], ageRating: ['16'] }))
      .toEqual({ condition: { allOf: [
        { seriesStatus: { operator: 'is', value: 'ONGOING' } },
        { ageRating: { operator: 'is', value: 16 } },
      ] } })
  })
  it('oneshot → oneShot isTrue/isFalse (no value)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, oneshot: true }))
      .toEqual({ condition: { oneShot: { operator: 'isTrue' } } })
    expect(filtersToCondition({ ...DEFAULT_FILTERS, oneshot: false }))
      .toEqual({ condition: { oneShot: { operator: 'isFalse' } } })
  })
  it('authors are AND-ed as author nodes (value {name})', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, authors: ['Neil Gaiman', 'Dave McKean'] }))
      .toEqual({ condition: { allOf: [
        { author: { operator: 'is', value: { name: 'Neil Gaiman' } } },
        { author: { operator: 'is', value: { name: 'Dave McKean' } } },
      ] } })
  })
  it('mixes facets with allOf and lifts search to fullTextSearch', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, authors: ['Neil Gaiman'], readStatus: ['UNREAD'], search: 'batman' }))
      .toEqual({
        condition: { allOf: [
          { readStatus: { operator: 'is', value: 'UNREAD' } },
          { author: { operator: 'is', value: { name: 'Neil Gaiman' } } },
        ] },
        fullTextSearch: 'batman',
      })
  })
  it('search only → fullTextSearch, no condition', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, search: 'akira' })).toEqual({ fullTextSearch: 'akira' })
  })
})

describe('listQueryParams', () => {
  it('emits sort/page/size, mapping the sort key', () => {
    const p = listQueryParams({ ...DEFAULT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' }, 2, 50)
    expect(p.get('sort')).toBe('createdDate,desc')
    expect(p.get('page')).toBe('2')
    expect(p.get('size')).toBe('50')
  })
})

describe('searchParamsToFilters validation', () => {
  it('drops invalid enum values and falls back to default sort', () => {
    const sp = new URLSearchParams('status=BOGUS,ONGOING&readStatus=NOPE,UNREAD&sortKey=hacked&sortDir=sideways')
    const f = searchParamsToFilters(sp)
    expect(f.status).toEqual(['ONGOING'])
    expect(f.readStatus).toEqual(['UNREAD'])
    expect(f.sortKey).toBe('titleSort')
    expect(f.sortDir).toBe('asc')
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
