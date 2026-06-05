import { describe, it, expect } from 'vitest'
import {
  parseLibraryName, groupLibraries, prettyLibraryName,
  SMART_PRESETS, applySmartFolder, isSmartFolderActive,
} from './library'
import { DEFAULT_FILTERS, type Filters } from './komga/filters'
import type { KomgaLibrary } from './komga/types'

describe('parseLibraryName', () => {
  it('maps the three axis prefixes to group + clean label', () => {
    expect(parseLibraryName('xCat:Fra Star Wars')).toEqual({ group: 'Franchise', label: 'Star Wars' })
    expect(parseLibraryName('xCat:Pub Image')).toEqual({ group: 'Publisher', label: 'Image' })
    expect(parseLibraryName('xCat:Uni Marvel')).toEqual({ group: 'Universe', label: 'Marvel' })
  })
  it('falls back to Other for non-matching names', () => {
    expect(parseLibraryName('Plain Library')).toEqual({ group: 'Other', label: 'Plain Library' })
    expect(parseLibraryName('xCat:Zzz Weird')).toEqual({ group: 'Other', label: 'Weird' })
  })
})

describe('prettyLibraryName', () => {
  it('returns the clean label', () => {
    expect(prettyLibraryName('xCat:Pub Image')).toBe('Image')
    expect(prettyLibraryName('xCat:Uni Marvel')).toBe('Marvel')
    expect(prettyLibraryName('Plain Library')).toBe('Plain Library')
  })
})

describe('groupLibraries', () => {
  const libs: KomgaLibrary[] = [
    { id: 'u-marvel', name: 'xCat:Uni Marvel' },
    { id: 'p-image', name: 'xCat:Pub Image' },
    { id: 'f-starwars', name: 'xCat:Fra Star Wars' },
    { id: 'f-bone', name: 'xCat:Fra Bone' },
    { id: 'f-hasbro', name: 'xCat:Fra Hasbro', unavailable: true },
  ]
  it('orders groups Franchise → Publisher → Universe and sorts within a group', () => {
    const g = groupLibraries(libs)
    expect(g.map((x) => x.group)).toEqual(['Franchise', 'Publisher', 'Universe'])
    expect(g[0].libraries.map((l) => l.label)).toEqual(['Bone', 'Star Wars'])
  })
  it('drops unavailable libraries', () => {
    const fra = groupLibraries(libs).find((x) => x.group === 'Franchise')!
    expect(fra.libraries.some((l) => l.label === 'Hasbro')).toBe(false)
  })
  it('omits empty groups', () => {
    expect(groupLibraries([{ id: 'p', name: 'xCat:Pub Image' }]).map((x) => x.group)).toEqual(['Publisher'])
  })
  it('returns a trailing Other group for non-matching names', () => {
    const g = groupLibraries([
      { id: 'p', name: 'xCat:Pub Image' },
      { id: 'x', name: 'Plain Library' },
    ])
    expect(g.map((x) => x.group)).toEqual(['Publisher', 'Other'])
    expect(g[1].libraries).toEqual([{ id: 'x', label: 'Plain Library' }])
  })
})

describe('smart folders (scope-aware)', () => {
  it('applies a folder, preserving scope and clearing other facets', () => {
    const current: Filters = { ...DEFAULT_FILTERS, library: 'lib9', genre: ['Horror'], search: 'x' }
    const next = applySmartFolder(SMART_PRESETS.continue.filters, current)
    expect(next.library).toBe('lib9')
    expect(next.readStatus).toEqual(['IN_PROGRESS'])
    expect(next.genre).toEqual([])
    expect(next.search).toBeUndefined()
  })
  it('marks a folder active when the non-scope signature matches', () => {
    const applied = applySmartFolder(SMART_PRESETS.unread.filters, { ...DEFAULT_FILTERS, library: 'lib9' })
    expect(isSmartFolderActive(SMART_PRESETS.unread.filters, applied)).toBe(true)
    expect(isSmartFolderActive(SMART_PRESETS.continue.filters, applied)).toBe(false)
  })
})
