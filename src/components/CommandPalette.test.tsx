import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'
import type { KomgaLibrary } from '@/lib/komga/types'

// jsdom has no ResizeObserver; cmdk observes its list on mount. No-op shim —
// nothing here asserts on size. Kept local so the global setup stays untouched.
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

const remote = vi.hoisted(() => ({
  libraries: [] as { id: string; name: string }[],
  series: null as { content: { id: string; metadata: { title: string }; booksCount: number }[]; totalElements: number } | null,
}))

vi.mock('@/lib/komga/queries', () => ({
  useLibraries: () => ({ data: remote.libraries as KomgaLibrary[] }),
  useSearchSeries: () => ({ data: remote.series, isFetching: false }),
}))

async function openPalette() {
  const user = userEvent.setup()
  render(<MemoryRouter><CommandPalette /></MemoryRouter>)
  await user.keyboard('{Control>}k{/Control}')
  return user
}

describe('CommandPalette', () => {
  beforeEach(() => {
    localStorage.clear()
    remote.libraries = []
    remote.series = null
  })

  // A hard slice(0, 8) used to hide the rest: with shouldFilter={false} and a
  // query that only reaches the series endpoint, no input could reveal them.
  it('offers every library, not just the first eight', async () => {
    remote.libraries = Array.from({ length: 27 }, (_, i) => ({
      id: `l${i}`,
      name: `Lib ${String(i).padStart(2, '0')}`,
    }))
    await openPalette()
    expect(await screen.findByText('Lib 26')).toBeInTheDocument()
    expect(screen.getAllByText(/^Lib \d{2}$/)).toHaveLength(27)
  })

  it('narrows the library list by the typed query, matching the displayed name', async () => {
    remote.libraries = [
      { id: 'm', name: 'xCat:Pub Marvel' },
      { id: 'i', name: 'xCat:Pub Image' },
    ]
    const user = await openPalette()
    await user.type(await screen.findByPlaceholderText(/search series/i), 'marvel')
    expect(screen.getByText('Marvel')).toBeInTheDocument()
    expect(screen.queryByText('Image')).not.toBeInTheDocument()
  })

  it('does not match the raw taxonomy prefix the user never sees', async () => {
    remote.libraries = [{ id: 'm', name: 'xCat:Pub Marvel' }]
    const user = await openPalette()
    await user.type(await screen.findByPlaceholderText(/search series/i), 'xcat')
    expect(screen.queryByText('Marvel')).not.toBeInTheDocument()
  })

  it('discloses how many series matches are withheld', async () => {
    remote.series = {
      totalElements: 48,
      content: Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`,
        metadata: { title: `Batman ${i}` },
        booksCount: 3,
      })),
    }
    await openPalette()
    expect(await screen.findByText('Series (20 of 48)')).toBeInTheDocument()
  })

  it('keeps the plain heading when the page holds every match', async () => {
    remote.series = {
      totalElements: 2,
      content: [
        { id: 's0', metadata: { title: 'Spawn' }, booksCount: 196 },
        { id: 's1', metadata: { title: 'Preacher' }, booksCount: 144 },
      ],
    }
    await openPalette()
    expect(await screen.findByText('Series')).toBeInTheDocument()
  })
})
