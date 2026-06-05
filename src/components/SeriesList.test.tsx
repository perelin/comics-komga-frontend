import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

const capturedOpts = vi.fn()
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: unknown) => {
    capturedOpts(opts)
    return { getVirtualItems: () => [], getTotalSize: () => 0, measureElement: () => {} }
  },
}))

import { SeriesList } from './SeriesList'

const baseProps = {
  items: [], filters: DEFAULT_FILTERS, onFiltersChange: () => {}, hasNext: false, fetchNext: () => {},
}

describe('SeriesList scroll restore', () => {
  it('forwards initialOffset to the virtualizer', () => {
    render(<SeriesList {...baseProps} initialOffset={360} onScroll={() => {}} />)
    expect(capturedOpts).toHaveBeenCalled()
    expect(capturedOpts.mock.calls[0][0].initialOffset).toBe(360)
  })

  it('calls onScroll with the scroll container element when scrolled', () => {
    const onScroll = vi.fn()
    const { container } = render(<SeriesList {...baseProps} initialOffset={0} onScroll={onScroll} />)
    const scroller = container.querySelector('.overflow-auto') as HTMLElement
    fireEvent.scroll(scroller)
    expect(onScroll).toHaveBeenCalledWith(scroller)
  })
})
