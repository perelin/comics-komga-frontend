import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AddToReadListButton } from './AddToReadListButton'

// Regression: the create-new-list form lives inside the Radix PopoverContent.
// A preventDefault() on the content's click handler cancels the submit button's
// default action (form submission), so the menu-level test (which fires submit
// directly) stays green while the real click path is dead. These tests go
// through the actual popover + click chain.

const mutate = vi.fn()
vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: { content: [
    { id: 'r1', name: 'To Read', bookIds: ['a'] },
    { id: 'r2', name: 'Sci-Fi', bookIds: ['a', 'b'] },
  ] } }),
}))
vi.mock('@/lib/komga/mutations', () => ({ useAddToReadList: () => ({ mutate }) }))

// Radix popper positions via floating-ui, which needs ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

const target = { type: 'book', bookId: 'bX' } as const
const renderButton = () =>
  render(<MemoryRouter><AddToReadListButton target={target} /></MemoryRouter>)

const openPopover = () => fireEvent.click(screen.getByLabelText('Add to read list'))

beforeEach(() => mutate.mockClear())

describe('AddToReadListButton (through the real popover)', () => {
  it('quick-adds to the default queue', () => {
    renderButton()
    openPopover()
    fireEvent.click(screen.getByText('Schnell zu „To Read"'))
    expect(mutate).toHaveBeenCalledWith({ target, listId: 'default' })
  })

  it('creates a new list via a real click on the + submit button', () => {
    renderButton()
    openPopover()
    fireEvent.click(screen.getByText('Neue Liste…'))
    fireEvent.change(screen.getByPlaceholderText('Listenname…'), { target: { value: 'Horror' } })
    fireEvent.click(screen.getByLabelText('Liste anlegen'))
    expect(mutate).toHaveBeenCalledWith({ target, newListName: 'Horror' })
  })
})
