import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveFilters } from './ActiveFilters'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

describe('ActiveFilters', () => {
  it('shows a Creator chip and removes it on click', () => {
    const onChange = vi.fn()
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, authors: ['Neil Gaiman'] }} onChange={onChange} />)
    expect(screen.getByText('Neil Gaiman')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('remove Creator Neil Gaiman'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ authors: [] }))
  })

  it('hides series-only chips in the Issues dimension, keeps the shared ones', () => {
    const filters = { ...DEFAULT_FILTERS, publisher: ['Image'], genre: ['noir'], authors: ['Neil Gaiman'], readStatus: ['UNREAD' as const] }
    const { rerender } = render(<ActiveFilters filters={filters} onChange={vi.fn()} dim="series" />)
    expect(screen.getByText('Image')).toBeTruthy()
    expect(screen.getByText('noir')).toBeTruthy()

    rerender(<ActiveFilters filters={filters} onChange={vi.fn()} dim="issues" />)
    // series-only facets gone…
    expect(screen.queryByText('Image')).toBeNull()
    expect(screen.queryByText('noir')).toBeNull()
    // …shared facets still shown
    expect(screen.getByText('Neil Gaiman')).toBeTruthy()
    expect(screen.getByText('UNREAD')).toBeTruthy()
  })
})
