import { describe, it, expect, vi } from 'vitest'
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

const capturedOpts = vi.fn()
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (opts: unknown) => {
    capturedOpts(opts)
    return { getVirtualItems: () => [], getTotalSize: () => 0, measureElement: () => {} }
  },
}))

import { SeriesGrid } from './SeriesGrid'

describe('SeriesGrid scroll restore', () => {
  it('forwards initialOffset to the virtualizer', () => {
    render(<SeriesGrid items={[]} density="m" hasNext={false} fetchNext={() => {}} initialOffset={420} onScroll={() => {}} />)
    expect(capturedOpts).toHaveBeenCalled()
    expect(capturedOpts.mock.calls[0][0].initialOffset).toBe(420)
  })

  it('calls onScroll with the scroll container element when scrolled', () => {
    const onScroll = vi.fn()
    const { container } = render(<SeriesGrid items={[]} density="m" hasNext={false} fetchNext={() => {}} initialOffset={0} onScroll={onScroll} />)
    const scroller = container.querySelector('.overflow-auto') as HTMLElement
    fireEvent.scroll(scroller)
    expect(onScroll).toHaveBeenCalledWith(scroller)
  })
})
