import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const useAuthorSearch = vi.fn()
vi.mock('@/lib/komga/queries', () => ({ useAuthorSearch: (q: string) => useAuthorSearch(q) }))

import { AuthorFacet } from './AuthorFacet'

describe('AuthorFacet', () => {
  it('shows results for the typed query and adds a chip on click', async () => {
    useAuthorSearch.mockReturnValue({ data: ['Neil Gaiman', 'Neil Adams'], isFetching: false })
    const onChange = vi.fn()
    render(<AuthorFacet authors={[]} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/search creators/i), { target: { value: 'neil' } })
    fireEvent.click(await screen.findByText('Neil Gaiman'))
    expect(onChange).toHaveBeenCalledWith(['Neil Gaiman'])
  })

  it('renders selected authors as removable chips and excludes them from results', () => {
    useAuthorSearch.mockReturnValue({ data: ['Neil Gaiman'], isFetching: false })
    const onChange = vi.fn()
    render(<AuthorFacet authors={['Neil Gaiman']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('remove Neil Gaiman'))
    expect(onChange).toHaveBeenCalledWith([])
    expect(screen.queryByRole('button', { name: 'add Neil Gaiman' })).toBeNull()
  })
})
