import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toolbar } from './Toolbar'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'
import { mockViewport } from '@/test/viewport'

afterEach(() => vi.unstubAllGlobals())

describe('Toolbar', () => {
  it('shows the live result count and toggles view', () => {
    const onChange = vi.fn()
    render(
      <Toolbar count={1947} filters={DEFAULT_FILTERS} onFiltersChange={onChange}
        view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
        filterOpen={false} onToggleFilter={() => {}} />,
    )
    expect(screen.getByText('1,947')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /list/i }))
  })

  it('hides the view and density toggles on mobile', () => {
    mockViewport(true)
    render(
      <Toolbar count={1947} filters={DEFAULT_FILTERS} onFiltersChange={() => {}}
        view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
        filterOpen={false} onToggleFilter={() => {}} />,
    )
    expect(screen.queryByRole('button', { name: /grid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /list/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
  })
})
