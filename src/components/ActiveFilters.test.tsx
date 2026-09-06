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

  it('shows format chips with display labels and removes by raw kind', () => {
    const onChange = vi.fn()
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, format: ['tpb', 'singles'] }} onChange={onChange} />)
    expect(screen.getByText('TPB')).toBeTruthy()
    expect(screen.getByText('Singles')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('remove Format TPB'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ format: ['singles'] }))
  })

  it('shows a Mixed chip and clears the flag on remove', () => {
    const onChange = vi.fn()
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, formatMixed: true }} onChange={onChange} />)
    expect(screen.getByText('Mixed')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('remove Format Mixed'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ formatMixed: undefined }))
  })

  it('shows a Year chip spanning both bounds and clears both on remove', () => {
    const onChange = vi.fn()
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, yearMin: 1990, yearMax: 2020 }} onChange={onChange} />)
    expect(screen.getByText('1990–2020')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('remove Year 1990–2020'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ yearMin: undefined, yearMax: undefined }))
  })

  it('shows one-sided year bounds with ≥/≤ and stays visible in the Issues dimension', () => {
    const filters = { ...DEFAULT_FILTERS, yearMin: 1990 }
    const { rerender } = render(<ActiveFilters filters={filters} onChange={vi.fn()} dim="series" />)
    expect(screen.getByText('≥ 1990')).toBeTruthy()
    rerender(<ActiveFilters filters={{ ...DEFAULT_FILTERS, yearMax: 2020 }} onChange={vi.fn()} dim="issues" />)
    expect(screen.getByText('≤ 2020')).toBeTruthy()
  })

  it('renders point ranges as single values (1986, not 1986–1986)', () => {
    const onChange = vi.fn()
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, yearMin: 1986, yearMax: 1986, ratingMin: 4, ratingMax: 4 }} onChange={onChange} />)
    expect(screen.getByText('1986')).toBeTruthy()
    expect(screen.getByText('4 ★')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('remove Year 1986'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ yearMin: undefined, yearMax: undefined }))
  })

  it('trims rating bounds to the tag grid in the chip label', () => {
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, ratingMin: 4.15, ratingMax: 4.5 }} onChange={vi.fn()} />)
    expect(screen.getByText('4.15–4.5 ★')).toBeTruthy()
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
