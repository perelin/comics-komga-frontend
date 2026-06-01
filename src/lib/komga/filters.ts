import type { ReadStatus, SeriesStatus } from './types'

export type View = 'grid' | 'list'
export type Density = 's' | 'm' | 'l'
export type SortKey = 'titleSort' | 'createdDate' | 'lastModified'
export type SortDir = 'asc' | 'desc'

export interface Filters {
  readStatus: ReadStatus[]
  libraryId: string[]
  genre: string[]
  publisher: string[]
  status: SeriesStatus[]
  ageRating: string[]
  oneshot?: boolean
  search?: string
  sortKey: SortKey
  sortDir: SortDir
}

export const DEFAULT_FILTERS: Filters = {
  readStatus: [], libraryId: [], genre: [], publisher: [], status: [],
  ageRating: [], oneshot: undefined, search: undefined,
  sortKey: 'titleSort', sortDir: 'asc',
}

const ARRAY_KEYS = ['readStatus', 'libraryId', 'genre', 'publisher', 'status', 'ageRating'] as const

export function filtersToSearchParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  for (const k of ARRAY_KEYS) {
    if (f[k].length) sp.set(k, (f[k] as string[]).join(','))
  }
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
  const split = (v: string | null) => (v ? v.split(',') : [])
  const rawSortKey = sp.get('sortKey')
  const rawSortDir = sp.get('sortDir')
  return {
    readStatus: split(sp.get('readStatus')).filter((v): v is ReadStatus => VALID_READ_STATUS.includes(v as ReadStatus)),
    libraryId: split(sp.get('libraryId')),
    genre: split(sp.get('genre')),
    publisher: split(sp.get('publisher')),
    status: split(sp.get('status')).filter((v): v is SeriesStatus => VALID_SERIES_STATUS.includes(v as SeriesStatus)),
    ageRating: split(sp.get('ageRating')),
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

export function filtersToKomgaParams(f: Filters, page: number, size: number): URLSearchParams {
  const p = new URLSearchParams()
  if (f.readStatus.length) p.set('read_status', f.readStatus.join(','))
  if (f.libraryId.length) p.set('library_id', f.libraryId.join(','))
  if (f.genre.length) p.set('genre', f.genre.join(','))
  if (f.publisher.length) p.set('publisher', f.publisher.join(','))
  if (f.status.length) p.set('status', f.status.join(','))
  if (f.ageRating.length) p.set('age_rating', f.ageRating.join(','))
  if (f.oneshot !== undefined) p.set('oneshot', String(f.oneshot))
  if (f.search) p.set('search', f.search)
  p.set('sort', `${SORT_FIELD[f.sortKey]},${f.sortDir}`)
  p.set('page', String(page))
  p.set('size', String(size))
  return p
}
