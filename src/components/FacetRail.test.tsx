import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FacetRail } from './FacetRail'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

vi.mock('@/lib/komga/queries', () => ({
  useGenres: () => ({ data: ['Horror'] }),
  usePublishers: () => ({ data: ['Image'] }),
  useAgeRatings: () => ({ data: [16] }),
  useLibraries: () => ({ data: [{ id: 'l1', name: 'xCat:Pub Image' }] }),
  useAuthorSearch: () => ({ data: [], isFetching: false }),
}))

describe('FacetRail', () => {
  it('renders smart folders + the facet list, not the removed nav sections', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <FacetRail filters={DEFAULT_FILTERS} onChange={() => {}} />
      </QueryClientProvider>,
    )
    expect(screen.getByText('Continue reading')).toBeInTheDocument()
    expect(screen.getByText('Read status')).toBeInTheDocument()
    // The old nav sections are gone. Note: 'Libraries' was the old Sidebar nav
    // header (plural); the singular 'Library' filter facet inside FilterPanelInner
    // is separate and is removed in a later task.
    expect(screen.queryByText('Collections')).not.toBeInTheDocument()
    expect(screen.queryByText('Read lists')).not.toBeInTheDocument()
    expect(screen.queryByText('Libraries')).not.toBeInTheDocument()
  })
})
