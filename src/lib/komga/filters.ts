import type { ReadStatus, SeriesStatus } from './types'

export type View = 'grid' | 'list'
export type Density = 's' | 'm' | 'l'
export type SortKey = 'titleSort' | 'createdDate' | 'lastModified'
export type SortDir = 'asc' | 'desc'

export interface Filters {
  readStatus: ReadStatus[]
  library?: string
  genre: string[]
  publisher: string[]
  status: SeriesStatus[]
  ageRating: string[]
  authors: string[]
  oneshot?: boolean
  search?: string
  sortKey: SortKey
  sortDir: SortDir
}

export const DEFAULT_FILTERS: Filters = {
  readStatus: [], library: undefined, genre: [], publisher: [], status: [],
  ageRating: [], authors: [], oneshot: undefined, search: undefined,
  sortKey: 'titleSort', sortDir: 'asc',
}

export function resetFiltersKeepingSort(f: Filters): Filters {
  return { ...DEFAULT_FILTERS, library: f.library, sortKey: f.sortKey, sortDir: f.sortDir }
}

const ARRAY_KEYS = ['readStatus', 'genre', 'publisher', 'status', 'ageRating', 'authors'] as const

export function filtersToSearchParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  for (const k of ARRAY_KEYS) {
    if (f[k].length) sp.set(k, (f[k] as string[]).join(','))
  }
  if (f.library) sp.set('library', f.library)
  if (f.oneshot !== undefined) sp.set('oneshot', String(f.oneshot))
  if (f.search) sp.set('q', f.search)
  if (f.sortKey !== DEFAULT_FILTERS.sortKey) sp.set('sortKey', f.sortKey)
  if (f.sortDir !== DEFAULT_FILTERS.sortDir) sp.set('sortDir', f.sortDir)
  return sp
}

const VALID_READ_STATUS: ReadStatus[] = ['UNREAD', 'READ', 'IN_PROGRESS']
const VALID_SERIES_STATUS: SeriesStatus[] = ['ONGOING', 'ENDED', 'HIATUS', 'ABANDONED']
const VALID_SORT_KEYS: SortKey[] = ['titleSort', 'createdDate', 'lastModified']
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc']

export function searchParamsToFilters(sp: URLSearchParams): Filters {
  const split = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
  const rawSortKey = sp.get('sortKey')
  const rawSortDir = sp.get('sortDir')
  return {
    readStatus: split(sp.get('readStatus')).filter((v): v is ReadStatus => VALID_READ_STATUS.includes(v as ReadStatus)),
    library: sp.get('library') ?? undefined,
    genre: split(sp.get('genre')),
    publisher: split(sp.get('publisher')),
    status: split(sp.get('status')).filter((v): v is SeriesStatus => VALID_SERIES_STATUS.includes(v as SeriesStatus)),
    ageRating: split(sp.get('ageRating')),
    authors: split(sp.get('authors')),
    oneshot: sp.has('oneshot') ? sp.get('oneshot') === 'true' : undefined,
    search: sp.get('q') ?? undefined,
    sortKey: rawSortKey !== null && VALID_SORT_KEYS.includes(rawSortKey as SortKey) ? (rawSortKey as SortKey) : DEFAULT_FILTERS.sortKey,
    sortDir: rawSortDir !== null && VALID_SORT_DIRS.includes(rawSortDir as SortDir) ? (rawSortDir as SortDir) : DEFAULT_FILTERS.sortDir,
  }
}

const SORT_FIELD: Record<SortKey, string> = {
  titleSort: 'metadata.titleSort',
  createdDate: 'createdDate',
  lastModified: 'lastModified',
}

// --- POST /series/list search DSL (Komga v1.23.6, operator shapes live-verified) ---

export type Condition = Record<string, unknown>
export interface SeriesListBody {
  condition?: Condition
  fullTextSearch?: string
}

const isEq = (field: string, value: unknown): Condition => ({ [field]: { operator: 'is', value } })

/** A multi-value facet: nothing for 0, a bare node for 1, anyOf (OR) for many. */
function orFacet(field: string, values: unknown[]): Condition | null {
  if (values.length === 0) return null
  if (values.length === 1) return isEq(field, values[0])
  return { anyOf: values.map((v) => isEq(field, v)) }
}

/** Build the SeriesSearch body: allOf across facets, anyOf within a multi-value
 *  facet, allOf (AND) within the author facet, search → fullTextSearch. */
export function filtersToCondition(f: Filters): SeriesListBody {
  const parts: Condition[] = []
  const add = (c: Condition | null) => { if (c) parts.push(c) }

  add(orFacet('readStatus', f.readStatus))
  if (f.library) add(isEq('libraryId', f.library))
  add(orFacet('genre', f.genre))
  add(orFacet('publisher', f.publisher))
  add(orFacet('seriesStatus', f.status))
  add(orFacet('ageRating', f.ageRating.map(Number)))
  if (f.oneshot !== undefined) add({ oneShot: { operator: f.oneshot ? 'isTrue' : 'isFalse' } })
  // Authors: AND each (the concrete collaboration) — see spec decision 2.
  for (const name of f.authors) add({ author: { operator: 'is', value: { name } } })

  const body: SeriesListBody = {}
  if (parts.length === 1) body.condition = parts[0]
  else if (parts.length > 1) body.condition = { allOf: parts }
  if (f.search) body.fullTextSearch = f.search
  return body
}

export function listQueryParams(f: Filters, page: number, size: number): URLSearchParams {
  const p = new URLSearchParams()
  p.set('sort', `${SORT_FIELD[f.sortKey]},${f.sortDir}`)
  p.set('page', String(page))
  p.set('size', String(size))
  return p
}
