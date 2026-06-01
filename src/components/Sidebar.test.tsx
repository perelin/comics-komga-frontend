import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { prettyLibraryName } from '@/lib/library'

vi.mock('@/lib/komga/queries', () => ({
  useLibraries: () => ({ data: [{ id: 'l1', name: 'xCat:Pub Image' }], isLoading: false }),
  useReadLists: () => ({ data: { content: [{ id: 'r1', name: 'Best of 2024', bookIds: [] }] }, isLoading: false }),
  useCollections: () => ({ data: { content: [] }, isLoading: false }),
}))

describe('prettyLibraryName', () => {
  it('strips the xCat:Cat prefix', () => {
    expect(prettyLibraryName('xCat:Pub Image')).toBe('Image')
    expect(prettyLibraryName('xCat:Uni Marvel')).toBe('Marvel')
    expect(prettyLibraryName('Plain Library')).toBe('Plain Library')
  })
})

describe('Sidebar', () => {
  it('renders smart folders, a prettified library, and a readlist', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}><MemoryRouter>
        <Sidebar filters={{ readStatus: [], libraryId: [], genre: [], publisher: [], status: [], ageRating: [], sortKey: 'titleSort', sortDir: 'asc' }} onPickSmart={() => {}} />
      </MemoryRouter></QueryClientProvider>,
    )
    expect(screen.getByText('Continue reading')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.getByText('Best of 2024')).toBeInTheDocument()
  })
})
