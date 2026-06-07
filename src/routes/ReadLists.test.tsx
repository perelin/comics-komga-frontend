import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReadLists } from './ReadLists'

vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: { content: [
    { id: 'r1', name: 'To Read', summary: '', bookIds: ['a', 'b'] },
    { id: 'r2', name: 'Sci-Fi', summary: '', bookIds: ['a'] },
  ] }, isLoading: false }),
}))
vi.mock('@/lib/komga/mutations', () => ({
  useDeleteReadList: () => ({ mutate: vi.fn() }),
  useUpdateReadList: () => ({ mutate: vi.fn() }),
}))

// base-ui Dialog/Menu touch element.getAnimations(); jsdom lacks it.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.getAnimations ??= () => []
})

describe('ReadLists overview', () => {
  it('renders the lists with counts', () => {
    render(<MemoryRouter><ReadLists /></MemoryRouter>)
    // names appear in both the rail nav and the overview cards
    expect(screen.getAllByText('To Read').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sci-Fi').length).toBeGreaterThan(0)
    // the "N Hefte" label is unique to the overview cards
    expect(screen.getByText('2 Hefte')).toBeInTheDocument()
    expect(screen.getByText('1 Hefte')).toBeInTheDocument()
  })

  it('renders a list-actions menu trigger per card', () => {
    render(<MemoryRouter><ReadLists /></MemoryRouter>)
    expect(screen.getAllByLabelText('Listenaktionen')).toHaveLength(2)
  })
})
