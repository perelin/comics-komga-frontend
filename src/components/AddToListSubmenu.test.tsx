import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu'
import { AddToListSubmenu } from './AddToListSubmenu'

const mutate = vi.fn()
vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: { content: [
    { id: 'r1', name: 'To Read', bookIds: ['a'] },
    { id: 'r2', name: 'Sci-Fi', bookIds: ['a', 'b'] },
  ] } }),
}))
vi.mock('@/lib/komga/mutations', () => ({
  useAddToReadList: () => ({ mutate, isPending: false }),
}))

const onCreateNew = vi.fn()
const target = { type: 'book', bookId: 'bX' } as const

function renderMenu() {
  return render(
    <MemoryRouter>
      <DropdownMenu>
        <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
        <DropdownMenuContent>
          <AddToListSubmenu target={target} onCreateNew={onCreateNew} />
        </DropdownMenuContent>
      </DropdownMenu>
    </MemoryRouter>,
  )
}

async function openSubmenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Menü'))
  await user.click(await screen.findByRole('menuitem', { name: 'Zu Liste' }))
}

beforeEach(() => { mutate.mockClear(); onCreateNew.mockClear() })

describe('AddToListSubmenu', () => {
  it('quick-adds the target to the default queue', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openSubmenu(user)
    await user.click(await screen.findByRole('menuitem', { name: /Schnell zu „To Read"/ }))
    expect(mutate).toHaveBeenCalledWith({ target, listId: 'default' })
  })

  it('lists thematic lists (excluding To Read) and adds to one', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openSubmenu(user)
    expect(screen.queryByRole('menuitem', { name: 'To Read' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('menuitem', { name: /Sci-Fi/ }))
    expect(mutate).toHaveBeenCalledWith({ target, listId: 'r2' })
  })

  it('delegates creating a new list to the caller', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openSubmenu(user)
    await user.click(await screen.findByRole('menuitem', { name: 'Neue Liste…' }))
    expect(onCreateNew).toHaveBeenCalledTimes(1)
  })
})
