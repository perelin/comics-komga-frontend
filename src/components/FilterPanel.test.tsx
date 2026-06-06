import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FilterPanelInner } from './FilterPanel'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

vi.mock('@/lib/komga/queries', () => ({
  useGenres: () => ({ data: ['Science Fiction', 'Noir'] }),
  usePublishers: () => ({ data: ['Image', 'Dark Horse'] }),
  useAgeRatings: () => ({ data: [16, 18] }),
  useAuthorSearch: () => ({ data: [], isFetching: false }),
}))

function renderPanel(filters = DEFAULT_FILTERS, onChange = vi.fn()) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}><FilterPanelInner filters={filters} onChange={onChange} /></QueryClientProvider>,
  )
}

describe('FilterPanelInner', () => {
  beforeEach(() => localStorage.clear())

  it('toggles a read-status facet and emits updated filters', () => {
    const onChange = vi.fn()
    renderPanel(DEFAULT_FILTERS, onChange)
    // Read status is collapsed by default — expand it first.
    fireEvent.click(screen.getByRole('button', { name: 'Read status' }))
    fireEvent.click(screen.getByLabelText('Unread'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ readStatus: ['UNREAD'] }))
  })

  it('renders the Creators facet but no Library facet (scope moved to the toolbar)', () => {
    renderPanel()
    expect(screen.getByText('Creators')).toBeInTheDocument()
    expect(screen.queryByText('Library')).not.toBeInTheDocument()
    // The creators search input lives inside the (collapsed) Creators body.
    fireEvent.click(screen.getByRole('button', { name: 'Creators' }))
    expect(screen.getByPlaceholderText(/search creators/i)).toBeInTheDocument()
  })

  it('renders all facets collapsed by default', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Read status' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('One-shots only')).not.toBeInTheDocument()
  })

  it('auto-expands a facet that has an active selection', () => {
    renderPanel({ ...DEFAULT_FILTERS, genre: ['Science Fiction'] })
    expect(screen.getByRole('button', { name: 'Genre' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Science Fiction')).toBeInTheDocument()
    // A facet without a selection stays collapsed.
    expect(screen.getByRole('button', { name: 'Read status' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands and collapses a facet on header click', () => {
    renderPanel()
    const header = screen.getByRole('button', { name: 'Status' })
    expect(screen.queryByLabelText('Ongoing')).not.toBeInTheDocument()
    fireEvent.click(header)
    expect(screen.getByLabelText('Ongoing')).toBeInTheDocument()
    fireEvent.click(header)
    expect(screen.queryByLabelText('Ongoing')).not.toBeInTheDocument()
  })

  it('lets an explicit collapse override the active-selection auto-open', () => {
    renderPanel({ ...DEFAULT_FILTERS, genre: ['Science Fiction'] })
    const header = screen.getByRole('button', { name: 'Genre' })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(header) // collapse despite the active genre
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Science Fiction')).not.toBeInTheDocument()
  })

  it('persists an explicit toggle to localStorage', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Read status' }))
    const stored = JSON.parse(localStorage.getItem('komga.facets.open') ?? '{}')
    expect(stored.readStatus).toBe(true)
  })
})
