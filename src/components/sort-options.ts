import type { Filters, SortKey, SortDir } from '@/lib/komga/filters'

export type SortOption = {
  key: SortKey
  label: string
  defaultDir: SortDir
  directional: boolean
  dirLabels: { asc: string; desc: string }
}

export const SORT_OPTIONS: SortOption[] = [
  { key: 'titleSort',    label: 'Title',        defaultDir: 'asc',  directional: true,  dirLabels: { asc: 'A → Z',        desc: 'Z → A' } },
  { key: 'createdDate',  label: 'Date added',   defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Newest first' } },
  { key: 'lastModified', label: 'Date updated', defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Newest first' } },
  { key: 'releaseDate',  label: 'Release date', defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Newest first' } },
  { key: 'booksCount',   label: 'Books',        defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Fewest first', desc: 'Most first' } },
  { key: 'readDate',     label: 'Last read',    defaultDir: 'desc', directional: true,  dirLabels: { asc: 'Oldest first', desc: 'Recently read' } },
  { key: 'random',       label: 'Random',       defaultDir: 'desc', directional: false, dirLabels: { asc: '', desc: '' } },
]

/** Switching the sort field resets the direction to that field's sensible default. */
export function applySortField(f: Filters, key: SortKey): Filters {
  const o = SORT_OPTIONS.find((x) => x.key === key) ?? SORT_OPTIONS[0]
  return { ...f, sortKey: o.key, sortDir: o.defaultDir }
}
