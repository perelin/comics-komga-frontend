import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

const scrollToIndex = vi.fn()
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [{ index: 0, key: 0, start: 0, end: 52, size: 52, lane: 0 }],
    getTotalSize: () => 52,
    measureElement: () => {},
    scrollToIndex,
  }),
}))
vi.mock('./SeriesRow', () => ({ SeriesRow: () => null, SERIES_GRID_COLS: 'repeat(8,1fr)' }))

import { SeriesList } from './SeriesList'
import type { SeriesVM } from '@/lib/komga/mapping'

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 's' + i }) as unknown as SeriesVM)
const base = { filters: DEFAULT_FILTERS, onFiltersChange: () => {}, hasNext: false, fetchNext: () => {} }

describe('SeriesList scroll restore (anchor)', () => {
  beforeEach(() => scrollToIndex.mockClear())

  it('scrolls the saved item to the top on mount', () => {
    render(<SeriesList {...base} items={items(10)} initialIndex={4} onTopIndex={() => {}} />)
    expect(scrollToIndex).toHaveBeenCalledWith(4, { align: 'start' })
  })

  it('does not scroll when no anchor is saved', () => {
    render(<SeriesList {...base} items={items(3)} onTopIndex={() => {}} />)
    expect(scrollToIndex).not.toHaveBeenCalled()
  })

  it('reports the first visible item index while scrolling', () => {
    const onTopIndex = vi.fn()
    const { container } = render(<SeriesList {...base} items={items(2)} onTopIndex={onTopIndex} />)
    fireEvent.scroll(container.querySelector('.overflow-auto') as HTMLElement)
    expect(onTopIndex).toHaveBeenCalledWith(0)
  })
})
