import { Clock, Sparkles, BookOpen } from 'lucide-react'
import { DEFAULT_FILTERS, type Filters } from '@/lib/komga/filters'
import type { KomgaLibrary } from '@/lib/komga/types'

export type LibraryGroup = 'Franchise' | 'Publisher' | 'Universe' | 'Other'

// `xCat:<Group> <Name>` — the 3-axis taxonomy prefix. Fra/Pub/Uni map to the
// human group; anything else falls back to {Other, full name}.
const GROUP_MAP: Record<string, LibraryGroup> = { Fra: 'Franchise', Pub: 'Publisher', Uni: 'Universe' }
const GROUP_ORDER: LibraryGroup[] = ['Franchise', 'Publisher', 'Universe', 'Other']

export function parseLibraryName(name: string): { group: LibraryGroup; label: string } {
  const m = /^xCat:([A-Za-z]+)\s+(.*)$/.exec(name)
  if (!m) return { group: 'Other', label: name }
  return { group: GROUP_MAP[m[1]] ?? 'Other', label: m[2].trim() }
}

export function prettyLibraryName(name: string): string {
  return parseLibraryName(name).label
}

// Short axis prefix for breadcrumb crumbs — disambiguates otherwise opaque
// labels (e.g. the "Other" publisher bucket → "Pub: Other"). The fallback
// "Other" group carries no meaningful prefix, so the bare label is used.
const SHORT_GROUP: Record<LibraryGroup, string> = { Franchise: 'Fra', Publisher: 'Pub', Universe: 'Uni', Other: '' }
export function libraryCrumbLabel(name: string): string {
  const { group, label } = parseLibraryName(name)
  const prefix = SHORT_GROUP[group]
  return prefix ? `${prefix}: ${label}` : label
}

export interface LibraryGroupVM { group: LibraryGroup; libraries: { id: string; label: string }[] }

// Drop unavailable libraries (e.g. Hasbro), bucket by axis, sort within a group
// by label, return groups in fixed order. Empty groups are omitted.
export function groupLibraries(libs: KomgaLibrary[]): LibraryGroupVM[] {
  const buckets = new Map<LibraryGroup, { id: string; label: string }[]>()
  for (const lib of libs) {
    if (lib.unavailable) continue
    const { group, label } = parseLibraryName(lib.name)
    const arr = buckets.get(group) ?? []
    arr.push({ id: lib.id, label })
    buckets.set(group, arr)
  }
  return GROUP_ORDER.flatMap((group) => {
    const libraries = buckets.get(group)
    if (!libraries?.length) return []
    libraries.sort((a, b) => a.label.localeCompare(b.label))
    return [{ group, libraries }]
  })
}

export type SmartFolder = 'continue' | 'recent' | 'unread'
export const SMART_PRESETS: Record<SmartFolder, { label: string; icon: typeof Clock; filters: Filters }> = {
  continue: { label: 'Continue reading', icon: Clock, filters: { ...DEFAULT_FILTERS, readStatus: ['IN_PROGRESS'] } },
  recent: { label: 'Recently added', icon: Sparkles, filters: { ...DEFAULT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' } },
  unread: { label: 'Unread', icon: BookOpen, filters: { ...DEFAULT_FILTERS, readStatus: ['UNREAD'] } },
}

// Apply a smart folder WITHOUT touching the active scope: take the preset's
// signature (DEFAULT_FILTERS + the folder's defining state) and graft the
// current library scope back in. Clears every other facet + search.
export function applySmartFolder(preset: Filters, current: Filters): Filters {
  return { ...preset, library: current.library }
}

// A folder is active when every NON-scope field of `current` matches the preset.
const SIGNATURE_KEYS: (keyof Filters)[] = [
  'readStatus', 'genre', 'publisher', 'status', 'ageRating', 'authors', 'format', 'formatMixed', 'search', 'sortKey', 'sortDir',
]
export function isSmartFolderActive(preset: Filters, current: Filters): boolean {
  // Compares serialized values per key; relies on canonical array order (presets use [] or single-element arrays, so order is stable).
  return SIGNATURE_KEYS.every((k) => JSON.stringify(preset[k]) === JSON.stringify(current[k]))
}
