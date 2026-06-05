import { describe, it, expect, vi } from 'vitest'
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

function renderPanel(onChange = vi.fn()) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}><FilterPanelInner filters={DEFAULT_FILTERS} onChange={onChange} /></QueryClientProvider>)
}

describe('FilterPanelInner', () => {
  it('toggles a read-status facet and emits updated filters', () => {
    const onChange = vi.fn()
    renderPanel(onChange)
    fireEvent.click(screen.getByLabelText('Unread'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ readStatus: ['UNREAD'] }))
  })

  it('renders the Creators facet but no Library facet (scope moved to the toolbar)', () => {
    renderPanel()
    expect(screen.getByText('Creators')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search creators/i)).toBeInTheDocument()
    expect(screen.queryByText('Library')).not.toBeInTheDocument()
  })
})
