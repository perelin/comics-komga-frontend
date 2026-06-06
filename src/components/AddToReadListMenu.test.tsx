import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AddToReadListMenu } from './AddToReadListMenu'

const mutate = vi.fn()
vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: { content: [
    { id: 'r1', name: 'To Read', bookIds: ['a'] },
    { id: 'r2', name: 'Sci-Fi', bookIds: ['a', 'b'] },
  ] } }),
}))
vi.mock('@/lib/komga/mutations', () => ({ useAddToReadList: () => ({ mutate }) }))

const renderMenu = () =>
  render(<MemoryRouter><AddToReadListMenu target={{ type: 'book', bookId: 'bX' }} /></MemoryRouter>)

beforeEach(() => mutate.mockClear())

describe('AddToReadListMenu', () => {
  it('quick-adds to the default queue', () => {
    renderMenu()
    fireEvent.click(screen.getByText('Schnell zu „To Read"'))
    expect(mutate).toHaveBeenCalledWith({ target: { type: 'book', bookId: 'bX' }, listId: 'default' })
  })
  it('lists thematic lists (excluding To Read) and adds to one', () => {
    renderMenu()
    expect(screen.queryByText('Sci-Fi')).toBeInTheDocument()
    expect(screen.queryByText('To Read')).not.toBeInTheDocument() // only the quick-add row, no duplicate list entry
    fireEvent.click(screen.getByText('Sci-Fi'))
    expect(mutate).toHaveBeenCalledWith({ target: { type: 'book', bookId: 'bX' }, listId: 'r2' })
  })
  it('creates a new seeded list', () => {
    renderMenu()
    fireEvent.click(screen.getByText('Neue Liste…'))
    fireEvent.change(screen.getByPlaceholderText('Listenname…'), { target: { value: 'Horror' } })
    fireEvent.submit(screen.getByPlaceholderText('Listenname…').closest('form')!)
    expect(mutate).toHaveBeenCalledWith({ target: { type: 'book', bookId: 'bX' }, newListName: 'Horror' })
  })
})
