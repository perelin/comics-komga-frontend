import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toolbar } from './Toolbar'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'
import { mockViewport } from '@/test/viewport'

vi.mock('@/lib/komga/queries', () => ({ useLibraries: () => ({ data: [] }) }))

afterEach(() => vi.unstubAllGlobals())

function renderToolbar() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <Toolbar count={1947} filters={DEFAULT_FILTERS} onFiltersChange={vi.fn()}
        view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
        filterOpen={false} onToggleFilter={() => {}} />
    </QueryClientProvider>,
  )
}

describe('Toolbar', () => {
  it('shows the count, toggles view, and hides the Filters toggle on desktop', () => {
    renderToolbar()
    expect(screen.getByText('1,947')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /list/i }))
    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument()
  })

  it('hides view/density and shows the Filters toggle on mobile', () => {
    mockViewport(true)
    renderToolbar()
    expect(screen.queryByRole('button', { name: /grid/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /list/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
  })
})
