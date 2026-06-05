import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

// jsdom has no ResizeObserver; SeriesGrid's useColumns needs one. No-op shim,
// kept file-local: a global shim in test/setup.ts pushes base-ui's ScrollArea
// (used by ScopePicker etc.) into a jsdom-incompatible getAnimations() path.
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

const scrollToIndex = vi.fn()
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [{ index: 0, key: 0, start: 0, end: 300, size: 300, lane: 0 }],
    getTotalSize: () => 300,
    measureElement: () => {},
    scrollToIndex,
  }),
}))
vi.mock('./SeriesCard', () => ({ SeriesCard: () => null }))

import { SeriesGrid } from './SeriesGrid'
import type { SeriesVM } from '@/lib/komga/mapping'

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 's' + i }) as unknown as SeriesVM)
const base = { density: 'm' as const, hasNext: false, fetchNext: () => {} }

describe('SeriesGrid scroll restore (anchor)', () => {
  beforeEach(() => scrollToIndex.mockClear())

  it('scrolls the saved item row to the top on mount', () => {
    render(<SeriesGrid {...base} items={items(12)} initialIndex={7} onTopIndex={() => {}} />)
    // jsdom container width 0 → cols clamps to 1 → rowIndex === item index
    expect(scrollToIndex).toHaveBeenCalledWith(7, { align: 'start' })
  })

  it('does not scroll when no anchor is saved', () => {
    render(<SeriesGrid {...base} items={items(3)} onTopIndex={() => {}} />)
    expect(scrollToIndex).not.toHaveBeenCalled()
  })

  it('reports the first visible item index while scrolling', () => {
    const onTopIndex = vi.fn()
    const { container } = render(<SeriesGrid {...base} items={items(2)} onTopIndex={onTopIndex} />)
    fireEvent.scroll(container.querySelector('.overflow-auto') as HTMLElement)
    expect(onTopIndex).toHaveBeenCalledWith(0) // top row index 0 × cols
  })
})
