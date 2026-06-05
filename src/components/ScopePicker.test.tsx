import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScopePicker } from './ScopePicker'

vi.mock('@/lib/komga/queries', () => ({
  useLibraries: () => ({
    data: [
      { id: 'p-image', name: 'xCat:Pub Image' },
      { id: 'u-marvel', name: 'xCat:Uni Marvel' },
      { id: 'f-hasbro', name: 'xCat:Fra Hasbro', unavailable: true },
    ],
  }),
}))

describe('ScopePicker', () => {
  it('shows the All default when no scope is set', () => {
    render(<ScopePicker value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Library scope' })).toHaveTextContent('All libraries')
  })

  it('shows the grouped active label and clears via the ✕', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScopePicker value="u-marvel" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Library scope' })).toHaveTextContent('Universe · Marvel')
    await user.click(screen.getByLabelText('Clear scope'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('opens a grouped, searchable list and hides unavailable libraries', async () => {
    const user = userEvent.setup()
    render(<ScopePicker value={undefined} onChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Library scope' }))
    expect(await screen.findByText('Publisher')).toBeInTheDocument()
    expect(screen.getByText('Universe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marvel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hasbro' })).not.toBeInTheDocument()
  })

  it('filters the list via the search box', async () => {
    const user = userEvent.setup()
    render(<ScopePicker value={undefined} onChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Library scope' }))
    await user.type(await screen.findByPlaceholderText('Search libraries…'), 'mar')
    expect(screen.getByRole('button', { name: 'Marvel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Image' })).not.toBeInTheDocument()
  })

  it('single-selects a library and resets via All (no checkboxes)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ScopePicker value={undefined} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Library scope' }))
    await user.click(await screen.findByRole('button', { name: 'Marvel' }))
    expect(onChange).toHaveBeenCalledWith('u-marvel')

    await user.click(screen.getByRole('button', { name: 'Library scope' }))
    await user.click(await screen.findByRole('button', { name: 'All libraries' }))
    expect(onChange).toHaveBeenCalledWith(undefined)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
