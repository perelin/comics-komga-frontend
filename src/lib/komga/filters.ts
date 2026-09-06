import type { ReadStatus, SeriesStatus } from './types'
import { isFormatKind, type FormatKind } from './format'

export type View = 'grid' | 'list'
/** The browse dimension: series-grouped (default) vs. flat individual issues. */
export type BrowseDim = 'series' | 'issues'
export type Density = 's' | 'm' | 'l'
export type SortKey =
  | 'titleSort' | 'createdDate' | 'lastModified'
  | 'releaseDate' | 'booksCount' | 'readDate' | 'random'
  // Issues-only: natural issue ordering (metadata.numberSort). Never a series sort.
  | 'number'
export type SortDir = 'asc' | 'desc'

export interface Filters {
  readStatus: ReadStatus[]
  library?: string
  genre: string[]
  publisher: string[]
  status: SeriesStatus[]
  ageRating: string[]
  authors: string[]
  /** format:* tag facet — selected primary formats (OR). Untagged series never match. */
  format: FormatKind[]
  /** true = only series flagged `format:mixed` (the data-quality cleanup list). */
  formatMixed?: boolean
  /** Inclusive rating bounds (1–5 stars) on the 0.05 tag grid (snapRating).
   *  Both undefined = no rating filter; min === max = point range (exact tag). */
  ratingMin?: number
  ratingMax?: number
  /** Inclusive release-year bounds. Series dim: the aggregated series start
   *  year (booksMetadata.releaseDate = MIN of its books — live-verified);
   *  issues dim: per-book metadata.releaseDate. Both undefined = inactive;
   *  min === max = exactly that year. */
  yearMin?: number
  yearMax?: number
  search?: string
  sortKey: SortKey
  sortDir: SortDir
}

export const DEFAULT_FILTERS: Filters = {
  readStatus: [], library: undefined, genre: [], publisher: [], status: [],
  ageRating: [], authors: [], format: [], formatMixed: undefined,
  ratingMin: undefined, ratingMax: undefined,
  yearMin: undefined, yearMax: undefined, search: undefined,
  sortKey: 'releaseDate', sortDir: 'desc',
}

export function resetFiltersKeepingSort(f: Filters): Filters {
  return { ...DEFAULT_FILTERS, library: f.library, sortKey: f.sortKey, sortDir: f.sortDir }
}

const ARRAY_KEYS = ['readStatus', 'genre', 'publisher', 'status', 'ageRating', 'authors', 'format'] as const

export function filtersToSearchParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  for (const k of ARRAY_KEYS) {
    if (f[k].length) sp.set(k, (f[k] as string[]).join(','))
  }
  if (f.library) sp.set('library', f.library)
  if (f.formatMixed) sp.set('mixed', 'true')
  if (f.ratingMin !== undefined) sp.set('ratingMin', String(f.ratingMin))
  if (f.ratingMax !== undefined) sp.set('ratingMax', String(f.ratingMax))
  if (f.yearMin !== undefined) sp.set('yearMin', String(f.yearMin))
  if (f.yearMax !== undefined) sp.set('yearMax', String(f.yearMax))
  if (f.search) sp.set('q', f.search)
  if (f.sortKey !== DEFAULT_FILTERS.sortKey) sp.set('sortKey', f.sortKey)
  if (f.sortDir !== DEFAULT_FILTERS.sortDir) sp.set('sortDir', f.sortDir)
  return sp
}

/** Href to the library list, freshly scoped to the given facet(s). Used by
 *  clickable author/publisher names so a click lands on a clean filtered view
 *  (everything else reset), mirroring the breadcrumb's fresh-scope behaviour. */
export function facetHref(patch: Partial<Filters>): string {
  const qs = filtersToSearchParams({ ...DEFAULT_FILTERS, ...patch }).toString()
  return qs ? `/?${qs}` : '/'
}

const VALID_READ_STATUS: ReadStatus[] = ['UNREAD', 'READ', 'IN_PROGRESS']
const VALID_SERIES_STATUS: SeriesStatus[] = ['ONGOING', 'ENDED', 'HIATUS', 'ABANDONED']
const VALID_SORT_KEYS: SortKey[] = [
  'titleSort', 'createdDate', 'lastModified',
  'releaseDate', 'booksCount', 'readDate', 'random', 'number',
]
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc']

/** The granularity the `rating:X.XX` tags actually use is 0.05. Every rating
 *  bound must sit on this grid: a bound like 4.13 would make ratingFacet
 *  enumerate tags (`rating:4.13`, `rating:4.18`, …) that no series carries,
 *  silently matching nothing.
 *
 *  Snap a rating bound onto the tag grid, clamped to [1, 5]. Arithmetic stays
 *  on the integer-cent grid (snapped/100, never *0.05) so the result is the
 *  exact nearest double: 4.13 → 4.15, not 4.1500000000000004. */
export function snapRating(v: number): number {
  const cents = Math.round(v * 100)
  return Math.min(500, Math.max(100, Math.round(cents / 5) * 5)) / 100
}

/** Parse a rating bound: a finite number within [1, 5], snapped onto the 0.05
 *  tag grid (shared URLs / chips may carry off-grid values). */
function parseRatingBound(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? snapRating(n) : undefined
}

/** Parse a year bound: a finite integer in a sane window, else undefined.
 *  Strictly integer (Number, not parseInt) so "1990.5" doesn't truncate in. */
function parseYearBound(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = Number(v)
  return Number.isInteger(n) && n >= 1000 && n <= 3000 ? n : undefined
}

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
    format: split(sp.get('format')).filter(isFormatKind),
    formatMixed: sp.get('mixed') === 'true' ? true : undefined,
    ratingMin: parseRatingBound(sp.get('ratingMin')),
    ratingMax: parseRatingBound(sp.get('ratingMax')),
    yearMin: parseYearBound(sp.get('yearMin')),
    yearMax: parseYearBound(sp.get('yearMax')),
    search: sp.get('q') ?? undefined,
    sortKey: rawSortKey !== null && VALID_SORT_KEYS.includes(rawSortKey as SortKey) ? (rawSortKey as SortKey) : DEFAULT_FILTERS.sortKey,
    sortDir: rawSortDir !== null && VALID_SORT_DIRS.includes(rawSortDir as SortDir) ? (rawSortDir as SortDir) : DEFAULT_FILTERS.sortDir,
  }
}

// Sort field per dimension. Some keys are dimension-specific: `booksCount` only
// sorts series; `number` only sorts issues. The maps are Partial so a persisted
// sortKey that's invalid for the current dimension falls through to a default
// (see sortParam) — Komga 400s on an unknown sort field, so this must never leak.
const SORT_FIELD: Partial<Record<SortKey, string>> = {
  titleSort: 'metadata.titleSort',
  createdDate: 'createdDate',
  lastModified: 'lastModified',
  releaseDate: 'booksMetadata.releaseDate',
  booksCount: 'booksCount',
  readDate: 'readDate',
  random: 'random',
}
// Book-level sort fields — all live-verified against POST /books/list (v1.23.6).
const BOOK_SORT_FIELD: Partial<Record<SortKey, string>> = {
  titleSort: 'metadata.titleSort',
  number: 'metadata.numberSort',
  createdDate: 'createdDate',
  lastModified: 'lastModified',
  releaseDate: 'metadata.releaseDate',
  readDate: 'readProgress.readDate',
  random: 'random',
}

/** Facets that `/books/list` rejects (400) — they're series-level metadata. In
 *  the Issues dimension we omit them from the condition entirely, so a stale
 *  persisted publisher/genre/status/ageRating never reaches the book endpoint. */
const SERIES_ONLY_FACETS = ['genre', 'publisher', 'status', 'ageRating'] as const

/** The sort clause (`field,dir`) for a dimension. Falls back to each dimension's
 *  natural default when the persisted sortKey has no field in that dimension —
 *  guards against a malformed sort param after a dimension switch. */
function sortParam(f: Filters, dim: BrowseDim): string {
  const map = dim === 'issues' ? BOOK_SORT_FIELD : SORT_FIELD
  const fallback = dim === 'issues' ? 'metadata.numberSort' : 'metadata.titleSort'
  return `${map[f.sortKey] ?? fallback},${f.sortDir}`
}

// --- POST /series/list search DSL (operator shapes live-verified: v1.23.6 for
// --- the string/numeric/tag/author operators, 1.26.3 for the date operators) ---

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

/** Age rating "N+" facet — upward-inclusive: checking `17+` also matches 18 or
 *  21. Komga's numeric DSL has no >= operator (only `is` / `greaterthan` /
 *  `lessthan`, live-verified v1.23.6), so a bound becomes anyOf[is N, gt N].
 *  Since every selection is upward-open, OR-ing them collapses to the lowest
 *  bound — one node pair instead of one per checkbox. Non-numeric entries (the
 *  API reports "None" for unrated series) are dropped: Komga 500s on a null
 *  ageRating value, and "unrated" isn't expressible as a lower bound. */
function ageRatingFacet(values: string[]): Condition | null {
  const nums = values.map(Number).filter((n) => Number.isFinite(n))
  if (nums.length === 0) return null
  const min = Math.min(...nums)
  return { anyOf: [isEq('ageRating', min), { ageRating: { operator: 'greaterthan', value: min } }] }
}

/** Rating filter → anyOf over the discrete `rating:X.XX` tags in [min, max].
 *  Komga can't range-compare tag *values* (they're strings), so we enumerate the
 *  0.05 grid (the real tag granularity) and OR exact `tag is rating:X.XX` nodes —
 *  the only live-verified shape (POST /series/list, v1.23.6). Bounds default to the
 *  full 1–5 range; both undefined → no condition. min === max is a point range:
 *  a single tag node (GENAU 4.0 matches only the exact `rating:4.00` tag). The
 *  grid covers every real value in range (a 3.15-rated series falls in [3.0, 4.0]).
 *  Known minor gap: a stray 1-decimal tag `rating:3.8` (alongside `rating:3.80`)
 *  exists in the data; the 2-decimal grid only matches `rating:3.80`. ≤1 series. */
function ratingFacet(min?: number, max?: number): Condition | null {
  if (min === undefined && max === undefined) return null
  // Snap inward (ceil/floor) so the enumerated grid never exceeds the requested
  // range even for off-grid bounds that bypassed snapRating. A range narrower
  // than one grid step collapses to the grid point nearest its lower bound —
  // never an empty OR (an empty anyOf would silently deactivate the filter).
  const loC = Math.ceil(Math.round((min ?? 1) * 100) / 5) * 5
  const hiC = Math.floor(Math.round((max ?? 5) * 100) / 5) * 5
  const c0 = Math.min(loC, hiC)
  const c1 = Math.max(loC, hiC)
  const tags: string[] = []
  for (let c = c0; c <= c1; c += 5) tags.push(`rating:${(c / 100).toFixed(2)}`)
  return orFacet('tag', tags)
}

/** Release-year filter → an inclusive date window. Both DSLs take the plain
 *  field name `releaseDate` (series dim: the aggregated series start year; books
 *  dim: per-book metadata.releaseDate) with ONLY date operators `after`/`before`
 *  and a `dateTime` value key holding full RFC3339 with timezone — there is no
 *  `is`/`greaterthan` and no integer-year field (`year`/`releaseYear`/
 *  `metadata.releaseDate` are hard 400s; live-verified Komga 1.26.3).
 *  The lower bound MUST be Dec 31 23:59:59 of Y-1, not Jan 1 of Y: the operators
 *  compare at calendar-day granularity, so `after Y-01-01T00:00:00Z` excludes
 *  everything dated exactly Jan 1 of Y (verified: 8 vs 9 series, 95 vs 102 books
 *  for 1990). The upper bound `(Y+1)-01-01T00:00:00Z` is correct as-is.
 *  Returns the window's 0–2 bare nodes so filtersToCondition can keep every
 *  allOf flat — nested allOf under allOf is not a live-verified shape. */
function releaseDateFacet(min?: number, max?: number): Condition[] {
  const parts: Condition[] = []
  if (min !== undefined) parts.push({ releaseDate: { operator: 'after', dateTime: `${min - 1}-12-31T23:59:59Z` } })
  if (max !== undefined) parts.push({ releaseDate: { operator: 'before', dateTime: `${max + 1}-01-01T00:00:00Z` } })
  return parts
}

/** Build the search body for either dimension: allOf across facets, anyOf within
 *  a multi-value facet (the author facet included), search →
 *  fullTextSearch. In the Issues dimension the series-only facets (genre,
 *  publisher, seriesStatus, ageRating) are omitted — `/books/list` 400s on them.
 *  The shared facets (readStatus, library, format tag, rating tag, release year,
 *  author) use identical operator shapes on both `/series/list` and `/books/list`. */
export function filtersToCondition(f: Filters, dim: BrowseDim = 'series'): SeriesListBody {
  const parts: Condition[] = []
  const add = (c: Condition | null) => { if (c) parts.push(c) }
  const seriesOnly = dim === 'series'

  add(orFacet('readStatus', f.readStatus))
  if (f.library) add(isEq('libraryId', f.library))
  if (seriesOnly) add(orFacet('genre', f.genre))
  if (seriesOnly) add(orFacet('publisher', f.publisher))
  if (seriesOnly) add(orFacet('seriesStatus', f.status))
  if (seriesOnly) add(ageRatingFacet(f.ageRating))
  // Format: OR over the selected primary format:* tags. Untagged ("unknown")
  // series carry no format tag, so any active selection excludes them.
  add(orFacet('tag', f.format.map((k) => `format:${k}`)))
  if (f.formatMixed) add(isEq('tag', 'format:mixed'))
  add(ratingFacet(f.ratingMin, f.ratingMax))
  parts.push(...releaseDateFacet(f.yearMin, f.yearMax))
  // Creators: OR over the selected names (everything they worked on, not only
  // their joint work) — the same "OR within a facet" rule as every other facet.
  add(orFacet('author', f.authors.map((name) => ({ name }))))

  const body: SeriesListBody = {}
  if (parts.length === 1) body.condition = parts[0]
  else if (parts.length > 1) body.condition = { allOf: parts }
  if (f.search) body.fullTextSearch = f.search
  return body
}

export function listQueryParams(f: Filters, page: number, size: number, dim: BrowseDim = 'series'): URLSearchParams {
  const p = new URLSearchParams()
  p.set('sort', sortParam(f, dim))
  p.set('page', String(page))
  p.set('size', String(size))
  return p
}

/** True for facets `/books/list` rejects — used to grey them out in Issues mode. */
export function isSeriesOnlyFacet(key: string): boolean {
  return (SERIES_ONLY_FACETS as readonly string[]).includes(key)
}
