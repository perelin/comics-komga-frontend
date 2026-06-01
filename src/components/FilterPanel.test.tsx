import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FilterPanel } from './FilterPanel'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

vi.mock('@/lib/komga/queries', () => ({
  useGenres: () => ({ data: ['Science Fiction', 'Noir'] }),
  usePublishers: () => ({ data: ['Image', 'Dark Horse'] }),
  useAgeRatings: () => ({ data: [16, 18] }),
  useLibraries: () => ({ data: [{ id: 'l1', name: 'xCat:Pub Image' }] }),
}))

describe('FilterPanel', () => {
  it('toggles a read-status facet and emits updated filters', () => {
    const onChange = vi.fn()
    const qc = new QueryClient()
    render(<QueryClientProvider client={qc}><FilterPanel filters={DEFAULT_FILTERS} onChange={onChange} /></QueryClientProvider>)
    fireEvent.click(screen.getByLabelText('Unread'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ readStatus: ['UNREAD'] }))
  })
})
