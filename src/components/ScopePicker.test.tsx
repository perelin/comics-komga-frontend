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

  // Regression: with many libraries the list used to spill past the popup
  // without a background, because the scroll viewport never got a bounded
  // height. jsdom can't do layout, so pin the class chain that produces the
  // bound: height-capped popup → shrinkable ScrollArea → flexed viewport.
  it('caps the popup height and puts the list in a bounded scroll viewport', async () => {
    const user = userEvent.setup()
    render(<ScopePicker value={undefined} onChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Library scope' }))
    await screen.findByText('Publisher')

    const popup = document.querySelector('[data-slot="popover-content"]')!
    expect(popup.className).toContain('max-h-[min(40rem,var(--available-height))]')

    const scrollArea = popup.querySelector('[data-slot="scroll-area"]')!
    expect(scrollArea.className).toContain('min-h-0')
    expect(scrollArea.className).toContain('flex-1')

    const viewport = scrollArea.querySelector('[data-slot="scroll-area-viewport"]')!
    expect(viewport.className).toContain('min-h-0')
    expect(viewport.className).toContain('flex-1')
    expect(viewport).toContainElement(screen.getByRole('button', { name: 'Marvel' }))
  })
})
