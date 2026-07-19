import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toolbar } from './Toolbar'
import { SORT_OPTIONS, ISSUE_SORT_OPTIONS, applySortField, coerceSortForDim, sortOptionsFor } from './sort-options'
import { DEFAULT_FILTERS, type Filters, type BrowseDim } from '@/lib/komga/filters'
import { mockViewport } from '@/test/viewport'

vi.mock('@/lib/komga/queries', () => ({ useLibraries: () => ({ data: [] }) }))

afterEach(() => vi.unstubAllGlobals())

function renderToolbar() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <Toolbar count={1947} filters={DEFAULT_FILTERS} onFiltersChange={vi.fn()}
        dim="series" onDimChange={() => {}} view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
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

function renderSort(overrides: Partial<Filters> = {}) {
  const onFiltersChange = vi.fn()
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <Toolbar count={42} filters={{ ...DEFAULT_FILTERS, ...overrides }} onFiltersChange={onFiltersChange}
        dim="series" onDimChange={() => {}} view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
        filterOpen={false} onToggleFilter={() => {}} />
    </QueryClientProvider>,
  )
  return { onFiltersChange }
}

function renderDim(dim: BrowseDim) {
  const onDimChange = vi.fn()
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <Toolbar count={42} filters={DEFAULT_FILTERS} onFiltersChange={() => {}}
        dim={dim} onDimChange={onDimChange} view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
        filterOpen={false} onToggleFilter={() => {}} />
    </QueryClientProvider>,
  )
  return { onDimChange }
}

describe('Toolbar — browse dimension toggle', () => {
  it('renders both dimension buttons and is available on mobile', () => {
    mockViewport(true)
    renderDim('series')
    expect(screen.getByRole('button', { name: /Series/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Issues/ })).toBeInTheDocument()
  })
  it('switches to the Issues dimension on click', () => {
    const { onDimChange } = renderDim('series')
    fireEvent.click(screen.getByRole('button', { name: /Issues/ }))
    expect(onDimChange).toHaveBeenCalledWith('issues')
  })
  it('offers Issue # (not Books) as a sort option in the Issues dimension', () => {
    renderDim('issues')
    expect(sortOptionsFor('issues').map((o) => o.key)).toContain('number')
    expect(sortOptionsFor('issues').map((o) => o.key)).not.toContain('booksCount')
    expect(sortOptionsFor('series').map((o) => o.key)).toContain('booksCount')
    expect(sortOptionsFor('series').map((o) => o.key)).not.toContain('number')
  })
})

describe('coerceSortForDim', () => {
  it('keeps a sort valid in the target dimension unchanged', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'titleSort', sortDir: 'desc' }
    expect(coerceSortForDim(f, 'issues')).toBe(f)
    expect(coerceSortForDim(f, 'series')).toBe(f)
  })
  it('coerces a series-only sort (booksCount) to Issue # when switching to Issues', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'booksCount', sortDir: 'desc' }
    expect(coerceSortForDim(f, 'issues')).toMatchObject({ sortKey: 'number', sortDir: 'asc' })
  })
  it('coerces an issues-only sort (number) to Title when switching to Series', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'number', sortDir: 'desc' }
    expect(coerceSortForDim(f, 'series')).toMatchObject({ sortKey: 'titleSort', sortDir: 'asc' })
  })
  it('every issues sort option is valid for the issues dimension', () => {
    for (const o of ISSUE_SORT_OPTIONS) {
      const f: Filters = { ...DEFAULT_FILTERS, sortKey: o.key }
      expect(coerceSortForDim(f, 'issues')).toBe(f)
    }
  })
})

describe('applySortField', () => {
  it('resets direction to the field default (Title asc → Release date desc)', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'titleSort', sortDir: 'asc' }
    expect(applySortField(f, 'releaseDate')).toMatchObject({ sortKey: 'releaseDate', sortDir: 'desc' })
  })
  it('uses asc as the Title default', () => {
    const f: Filters = { ...DEFAULT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' }
    expect(applySortField(f, 'titleSort')).toMatchObject({ sortKey: 'titleSort', sortDir: 'asc' })
  })
  it('every option declares a label and default direction', () => {
    for (const o of SORT_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0)
      expect(['asc', 'desc']).toContain(o.defaultDir)
    }
  })
})

describe('Toolbar sort direction toggle', () => {
  it('flips sortDir and emits the new filters', async () => {
    const { onFiltersChange } = renderSort({ sortKey: 'titleSort', sortDir: 'asc' })
    await userEvent.click(screen.getByLabelText(/sort direction/i))
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ sortDir: 'desc' }))
  })
  it('is hidden for random sort', () => {
    renderSort({ sortKey: 'random' })
    expect(screen.queryByLabelText(/sort direction/i)).toBeNull()
  })
})
