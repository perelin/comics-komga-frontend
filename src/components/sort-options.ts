import type { Filters, SortKey, SortDir, BrowseDim } from '@/lib/komga/filters'

export type SortOption = {
  key: SortKey
  label: string
  defaultDir: SortDir
  directional: boolean
  dirLabels: { asc: string; desc: string }
}

const TITLE: SortOption   = { key: 'titleSort',    label: 'Title',        defaultDir: 'asc',  directional: true,  dirLabels: { asc: 'A → Z',        desc: 'Z → A' } }
const ADDED: SortOption   = { key: 'createdDate',  label: 'Date added',   defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Newest first' } }
const UPDATED: SortOption = { key: 'lastModified', label: 'Date updated', defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Newest first' } }
const RELEASE: SortOption = { key: 'releaseDate',  label: 'Release date', defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Newest first' } }
const READ: SortOption    = { key: 'readDate',     label: 'Last read',    defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Recently read' } }
const RANDOM: SortOption  = { key: 'random',       label: 'Random',       defaultDir: 'desc', directional: false, dirLabels: { asc: '', desc: '' } }
const BOOKS: SortOption   = { key: 'booksCount',   label: 'Books',        defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Fewest first', desc: 'Most first' } }
const NUMBER: SortOption  = { key: 'number',       label: 'Issue #',      defaultDir: 'asc',  directional: true,  dirLabels: { asc: 'Low → high',   desc: 'High → low' } }

// Series dimension: `booksCount` makes sense, `number` (per-issue order) doesn't.
export const SORT_OPTIONS: SortOption[] = [TITLE, ADDED, UPDATED, RELEASE, BOOKS, READ, RANDOM]
// Issues dimension: `number` orders individual issues; `booksCount` is meaningless.
export const ISSUE_SORT_OPTIONS: SortOption[] = [TITLE, NUMBER, ADDED, UPDATED, RELEASE, READ, RANDOM]

export function sortOptionsFor(dim: BrowseDim): SortOption[] {
  return dim === 'issues' ? ISSUE_SORT_OPTIONS : SORT_OPTIONS
}

/** Switching the sort field resets the direction to that field's sensible default. */
export function applySortField(f: Filters, key: SortKey): Filters {
  const o = [...SORT_OPTIONS, ...ISSUE_SORT_OPTIONS].find((x) => x.key === key) ?? SORT_OPTIONS[0]
  return { ...f, sortKey: o.key, sortDir: o.defaultDir }
}

/** Coerce a persisted sortKey that's invalid for the target dimension back to
 *  that dimension's natural default (issues → Issue #, series → Title). Keeps a
 *  stale `booksCount`/`number` from producing a malformed sort param on switch. */
export function coerceSortForDim(f: Filters, dim: BrowseDim): Filters {
  const opts = sortOptionsFor(dim)
  if (opts.some((o) => o.key === f.sortKey)) return f
  return applySortField(f, dim === 'issues' ? 'number' : 'titleSort')
}
