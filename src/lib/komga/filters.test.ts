import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FILTERS, filtersToSearchParams, searchParamsToFilters,
  filtersToCondition, listQueryParams, facetHref, isSeriesOnlyFacet,
  type Filters,
} from './filters'

describe('facetHref', () => {
  it('builds a freshly-scoped author URL (other facets reset)', () => {
    expect(facetHref({ authors: ['Brian K. Vaughan'] })).toBe('/?authors=Brian+K.+Vaughan')
  })
  it('builds a freshly-scoped publisher URL', () => {
    expect(facetHref({ publisher: ['Image'] })).toBe('/?publisher=Image')
  })
  it('round-trips back into a single-facet filter set', () => {
    const href = facetHref({ authors: ['Brian K. Vaughan'] })
    const sp = new URLSearchParams(href.slice(href.indexOf('?') + 1))
    expect(searchParamsToFilters(sp)).toEqual({ ...DEFAULT_FILTERS, authors: ['Brian K. Vaughan'] })
  })
})

describe('URL <-> Filters round-trip', () => {
  it('defaults produce empty search params', () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe('')
  })
  it('round-trips a populated filter set', () => {
    const f: Filters = {
      ...DEFAULT_FILTERS,
      readStatus: ['UNREAD'], genre: ['Science Fiction', 'Noir'],
      library: 'lib1', publisher: ['Image'], status: ['ONGOING'],
      ageRating: ['16'], format: ['tpb', 'singles'], formatMixed: true, search: 'incal',
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
  it('single library scope → one `is` libraryId condition', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, library: 'lib1' }))
      .toEqual({ condition: { libraryId: { operator: 'is', value: 'lib1' } } })
  })
  it('combines library scope with another facet via allOf', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, library: 'lib1', readStatus: ['UNREAD'] }))
      .toEqual({ condition: { allOf: [
        { readStatus: { operator: 'is', value: 'UNREAD' } },
        { libraryId: { operator: 'is', value: 'lib1' } },
      ] } })
  })
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
  it('maps status → seriesStatus and ageRating → an upward-inclusive bound', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, status: ['ONGOING'], ageRating: ['16'] }))
      .toEqual({ condition: { allOf: [
        { seriesStatus: { operator: 'is', value: 'ONGOING' } },
        { anyOf: [
          { ageRating: { operator: 'is', value: 16 } },
          { ageRating: { operator: 'greaterthan', value: 16 } },
        ] },
      ] } })
  })
  it('collapses several age ratings to the lowest bound (each is upward-open)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, ageRating: ['18', '13', '21'] }))
      .toEqual({ condition: { anyOf: [
        { ageRating: { operator: 'is', value: 13 } },
        { ageRating: { operator: 'greaterthan', value: 13 } },
      ] } })
  })
  it('drops non-numeric age ratings ("None") instead of sending a null bound', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, ageRating: ['None'] })).toEqual({})
    expect(filtersToCondition({ ...DEFAULT_FILTERS, ageRating: ['None', '17'] }))
      .toEqual({ condition: { anyOf: [
        { ageRating: { operator: 'is', value: 17 } },
        { ageRating: { operator: 'greaterthan', value: 17 } },
      ] } })
  })
  it('single format → bare format:* tag node (no anyOf wrapper)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, format: ['tpb'] }))
      .toEqual({ condition: { tag: { operator: 'is', value: 'format:tpb' } } })
  })
  it('multiple formats → anyOf over format:* tag nodes (OR within)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, format: ['tpb', 'singles'] }))
      .toEqual({ condition: { anyOf: [
        { tag: { operator: 'is', value: 'format:tpb' } },
        { tag: { operator: 'is', value: 'format:singles' } },
      ] } })
  })
  it('mixed toggle → an AND-ed format:mixed tag node', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, format: ['singles'], formatMixed: true }))
      .toEqual({ condition: { allOf: [
        { tag: { operator: 'is', value: 'format:singles' } },
        { tag: { operator: 'is', value: 'format:mixed' } },
      ] } })
  })
  it('authors are OR-ed as author nodes (value {name})', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, authors: ['Neil Gaiman', 'Dave McKean'] }))
      .toEqual({ condition: { anyOf: [
        { author: { operator: 'is', value: { name: 'Neil Gaiman' } } },
        { author: { operator: 'is', value: { name: 'Dave McKean' } } },
      ] } })
  })
  it('OR-s within the author facet but still AND-s it against other facets', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, publisher: ['Image'], authors: ['Neil Gaiman', 'Dave McKean'] }))
      .toEqual({ condition: { allOf: [
        { publisher: { operator: 'is', value: 'Image' } },
        { anyOf: [
          { author: { operator: 'is', value: { name: 'Neil Gaiman' } } },
          { author: { operator: 'is', value: { name: 'Dave McKean' } } },
        ] },
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

describe('rating filter', () => {
  it('round-trips ratingMin/ratingMax through the URL', () => {
    const f: Filters = { ...DEFAULT_FILTERS, ratingMin: 3.5, ratingMax: 4.5 }
    const sp = filtersToSearchParams(f)
    expect(sp.get('ratingMin')).toBe('3.5')
    expect(sp.get('ratingMax')).toBe('4.5')
    expect(searchParamsToFilters(sp)).toEqual(f)
  })
  it('round-trips a min-only bound', () => {
    const f: Filters = { ...DEFAULT_FILTERS, ratingMin: 4 }
    expect(searchParamsToFilters(filtersToSearchParams(f))).toEqual(f)
  })
  it('drops out-of-range / NaN rating bounds', () => {
    const f = searchParamsToFilters(new URLSearchParams('ratingMin=0.5&ratingMax=abc'))
    expect(f.ratingMin).toBeUndefined()
    expect(f.ratingMax).toBeUndefined()
  })
  it('no bounds → no condition', () => {
    expect(filtersToCondition(DEFAULT_FILTERS)).toEqual({})
  })
  it('enumerates the 0.05 grid in [min, max] as anyOf of exact tag nodes', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, ratingMin: 3.0, ratingMax: 3.1 }))
      .toEqual({ condition: { anyOf: [
        { tag: { operator: 'is', value: 'rating:3.00' } },
        { tag: { operator: 'is', value: 'rating:3.05' } },
        { tag: { operator: 'is', value: 'rating:3.10' } },
      ] } })
  })
  it('a single grid step → bare tag node (no anyOf wrapper)', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, ratingMin: 4.0, ratingMax: 4.0 }))
      .toEqual({ condition: { tag: { operator: 'is', value: 'rating:4.00' } } })
  })
  it('min-only bound runs the grid up to 5.00 (≥ threshold)', () => {
    const body = filtersToCondition({ ...DEFAULT_FILTERS, ratingMin: 4.5 })
    const nodes = (body.condition as { anyOf: unknown[] }).anyOf
    expect(nodes).toContainEqual({ tag: { operator: 'is', value: 'rating:4.50' } })
    expect(nodes).toContainEqual({ tag: { operator: 'is', value: 'rating:5.00' } })
    expect(nodes).toHaveLength(11) // 4.50..5.00 in 0.05 steps
  })
  it('combines the rating facet with other facets via allOf', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, readStatus: ['UNREAD'], ratingMin: 4.0, ratingMax: 4.0 }))
      .toEqual({ condition: { allOf: [
        { readStatus: { operator: 'is', value: 'UNREAD' } },
        { tag: { operator: 'is', value: 'rating:4.00' } },
      ] } })
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
  it('ignores a legacy repeatable ?libraryId= param', () => {
    expect(searchParamsToFilters(new URLSearchParams('libraryId=old1,old2')).library).toBeUndefined()
  })
  it('drops invalid enum values and falls back to default sort', () => {
    const sp = new URLSearchParams('status=BOGUS,ONGOING&readStatus=NOPE,UNREAD&sortKey=hacked&sortDir=sideways')
    const f = searchParamsToFilters(sp)
    expect(f.status).toEqual(['ONGOING'])
    expect(f.readStatus).toEqual(['UNREAD'])
    expect(f.sortKey).toBe('releaseDate')
    expect(f.sortDir).toBe('desc')
  })
})

describe('searchParamsToFilters drops empty author entries', () => {
  it('ignores blank names from a trailing comma', () => {
    expect(searchParamsToFilters(new URLSearchParams('authors=Neil Gaiman,')).authors).toEqual(['Neil Gaiman'])
  })
})

describe('format filter', () => {
  it('round-trips format kinds and the mixed toggle through the URL', () => {
    const f: Filters = { ...DEFAULT_FILTERS, format: ['omnibus', 'ogn'], formatMixed: true }
    const sp = filtersToSearchParams(f)
    expect(sp.get('format')).toBe('omnibus,ogn')
    expect(sp.get('mixed')).toBe('true')
    expect(searchParamsToFilters(sp)).toEqual(f)
  })
  it('drops unknown format kinds and a non-true mixed param', () => {
    const f = searchParamsToFilters(new URLSearchParams('format=tpb,hardcover,mixed&mixed=false'))
    // format:mixed is a flag, not a primary kind — it never enters the kind list.
    expect(f.format).toEqual(['tpb'])
    expect(f.formatMixed).toBeUndefined()
  })
})

describe('filtersToCondition — Issues dimension', () => {
  it('omits series-only facets (publisher/genre/status/ageRating) from the books body', () => {
    const f: Filters = {
      ...DEFAULT_FILTERS,
      publisher: ['Image'], genre: ['action'], status: ['ONGOING'], ageRating: ['16'],
    }
    // In series mode all four appear; in issues mode none may (books/list 400s on them).
    expect(filtersToCondition(f, 'issues')).toEqual({})
  })
  it('keeps the shared facets (readStatus/library/format/rating/author) in issues mode', () => {
    const f: Filters = {
      ...DEFAULT_FILTERS,
      library: 'lib1', readStatus: ['UNREAD'], format: ['tpb'], authors: ['Neil Gaiman'],
      // series-only facets present but must be dropped
      publisher: ['Image'], genre: ['noir'],
    }
    const body = filtersToCondition(f, 'issues')
    expect(body).toEqual({
      condition: {
        allOf: [
          { readStatus: { operator: 'is', value: 'UNREAD' } },
          { libraryId: { operator: 'is', value: 'lib1' } },
          { tag: { operator: 'is', value: 'format:tpb' } },
          { author: { operator: 'is', value: { name: 'Neil Gaiman' } } },
        ],
      },
    })
  })
  it('still carries fullTextSearch in issues mode', () => {
    expect(filtersToCondition({ ...DEFAULT_FILTERS, search: 'akira' }, 'issues'))
      .toEqual({ fullTextSearch: 'akira' })
  })
  it('defaults to the series dimension when omitted', () => {
    const f: Filters = { ...DEFAULT_FILTERS, publisher: ['Image'] }
    expect(filtersToCondition(f)).toEqual(filtersToCondition(f, 'series'))
    expect(filtersToCondition(f, 'series')).not.toEqual(filtersToCondition(f, 'issues'))
  })
})

describe('listQueryParams — Issues dimension sort', () => {
  it('maps issues-supported sort keys to book fields', () => {
    const cases = [
      { key: 'number', field: 'metadata.numberSort' },
      { key: 'releaseDate', field: 'metadata.releaseDate' },
      { key: 'readDate', field: 'readProgress.readDate' },
      { key: 'titleSort', field: 'metadata.titleSort' },
    ] as const
    for (const { key, field } of cases) {
      const f: Filters = { ...DEFAULT_FILTERS, sortKey: key, sortDir: 'desc' }
      expect(listQueryParams(f, 0, 20, 'issues').get('sort')).toBe(`${field},desc`)
    }
  })
  it('falls back to numberSort when a series-only sortKey (booksCount) leaks into issues mode', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'booksCount', sortDir: 'desc' }
    expect(listQueryParams(f, 0, 20, 'issues').get('sort')).toBe('metadata.numberSort,desc')
  })
  it('falls back to titleSort when an issues-only sortKey (number) leaks into series mode', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'number', sortDir: 'asc' }
    expect(listQueryParams(f, 0, 20, 'series').get('sort')).toBe('metadata.titleSort,asc')
  })
})

describe('isSeriesOnlyFacet', () => {
  it('flags the four facets books/list rejects', () => {
    for (const k of ['genre', 'publisher', 'status', 'ageRating']) expect(isSeriesOnlyFacet(k)).toBe(true)
    for (const k of ['readStatus', 'creators', 'rating', 'format', 'library']) expect(isSeriesOnlyFacet(k)).toBe(false)
  })
})

describe('new sort options', () => {
  const NEW_SORTS = [
    { key: 'releaseDate', field: 'booksMetadata.releaseDate' },
    { key: 'booksCount', field: 'booksCount' },
    { key: 'readDate', field: 'readDate' },
    { key: 'random', field: 'random' },
  ] as const

  it.each(NEW_SORTS)('round-trips sortKey=$key through the URL', ({ key }) => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: key, sortDir: 'desc' }
    expect(searchParamsToFilters(filtersToSearchParams(f))).toEqual(f)
  })

  it.each(NEW_SORTS)('listQueryParams maps $key → $field', ({ key, field }) => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: key, sortDir: 'desc' }
    expect(listQueryParams(f, 0, 20).get('sort')).toBe(`${field},desc`)
  })
})
