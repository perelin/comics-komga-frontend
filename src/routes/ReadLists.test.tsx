import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReadLists } from './ReadLists'

vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: { content: [
    { id: 'r1', name: 'To Read', bookIds: ['a', 'b'] },
    { id: 'r2', name: 'Sci-Fi', bookIds: ['a'] },
  ] }, isLoading: false }),
}))

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
})
