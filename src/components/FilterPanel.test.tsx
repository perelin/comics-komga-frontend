import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FilterPanelInner } from './FilterPanel'
import { DEFAULT_FILTERS, type Filters } from '@/lib/komga/filters'

const referential = vi.hoisted(() => ({
  genres: ['Science Fiction', 'Noir'] as string[],
  publishers: ['Image', 'Dark Horse'] as string[],
}))

vi.mock('@/lib/komga/queries', () => ({
  useGenres: () => ({ data: referential.genres }),
  usePublishers: () => ({ data: referential.publishers }),
  useAgeRatings: () => ({ data: ['None', 16, 18] }),
  useAuthorSearch: () => ({ data: [], isFetching: false }),
  useReleaseYears: () => ({ data: [1940, 2026] as [number, number] }),
  FALLBACK_YEAR_BOUNDS: [1950, 2026] as [number, number],
}))

function renderPanel(filters = DEFAULT_FILTERS, onChange = vi.fn()) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}><FilterPanelInner filters={filters} onChange={onChange} /></QueryClientProvider>,
  )
}

/** Like the real app: committed filters flow back into the props, so a second
 *  bound commit sees the first one (needed for building point ranges by typing). */
function ControlledPanel({ initial, log }: { initial: Filters; log: (f: Filters) => void }) {
  const [filters, setFilters] = useState(initial)
  return <FilterPanelInner filters={filters} onChange={(f) => { setFilters(f); log(f) }} />
}

function renderStatefulPanel(initial: Filters = DEFAULT_FILTERS) {
  const qc = new QueryClient()
  const log = vi.fn()
  return { log, ...render(<QueryClientProvider client={qc}><ControlledPanel initial={initial} log={log} /></QueryClientProvider>) }
}

/** Type into a labeled field and commit (blur; Enter is covered separately). */
function typeAndCommit(label: string, value: string) {
  const field = screen.getByLabelText(label)
  fireEvent.change(field, { target: { value } })
  fireEvent.blur(field)
}

describe('FilterPanelInner', () => {
  beforeEach(() => {
    localStorage.clear()
    referential.genres = ['Science Fiction', 'Noir']
    referential.publishers = ['Image', 'Dark Horse']
  })

  it('toggles a read-status facet and emits updated filters', () => {
    const onChange = vi.fn()
    renderPanel(DEFAULT_FILTERS, onChange)
    // Read status is collapsed by default — expand it first.
    fireEvent.click(screen.getByRole('button', { name: 'Read status' }))
    fireEvent.click(screen.getByLabelText('Unread'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ readStatus: ['UNREAD'] }))
  })

  it('renders the Creators facet but no Library facet (scope moved to the toolbar)', () => {
    renderPanel()
    expect(screen.getByText('Creators')).toBeInTheDocument()
    expect(screen.queryByText('Library')).not.toBeInTheDocument()
    // The creators search input lives inside the (collapsed) Creators body.
    fireEvent.click(screen.getByRole('button', { name: 'Creators' }))
    expect(screen.getByPlaceholderText(/search creators/i)).toBeInTheDocument()
  })

  it('offers numeric age ratings as "N+" bounds and hides the "None" entry', () => {
    const onChange = vi.fn()
    renderPanel(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByRole('button', { name: 'Age rating' }))
    expect(screen.getByLabelText('16+')).toBeInTheDocument()
    expect(screen.queryByLabelText('None+')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('16+'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ageRating: ['16'] }))
  })

  it('renders all facets collapsed by default', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Read status' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Singles')).not.toBeInTheDocument()
  })

  it('auto-expands a facet that has an active selection', () => {
    renderPanel({ ...DEFAULT_FILTERS, genre: ['Science Fiction'] })
    expect(screen.getByRole('button', { name: 'Genre' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Science Fiction')).toBeInTheDocument()
    // A facet without a selection stays collapsed.
    expect(screen.getByRole('button', { name: 'Read status' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands and collapses a facet on header click', () => {
    renderPanel()
    const header = screen.getByRole('button', { name: 'Status' })
    expect(screen.queryByLabelText('Ongoing')).not.toBeInTheDocument()
    fireEvent.click(header)
    expect(screen.getByLabelText('Ongoing')).toBeInTheDocument()
    fireEvent.click(header)
    expect(screen.queryByLabelText('Ongoing')).not.toBeInTheDocument()
  })

  it('lets an explicit collapse override the active-selection auto-open', () => {
    renderPanel({ ...DEFAULT_FILTERS, genre: ['Science Fiction'] })
    const header = screen.getByRole('button', { name: 'Genre' })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(header) // collapse despite the active genre
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Science Fiction')).not.toBeInTheDocument()
  })

  it('persists an explicit toggle to localStorage', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Read status' }))
    const stored = JSON.parse(localStorage.getItem('komga.facets.open') ?? '{}')
    expect(stored.readStatus).toBe(true)
  })

  it('auto-expands the Rating facet when a bound is active and shows the range label', () => {
    renderPanel({ ...DEFAULT_FILTERS, ratingMin: 4 })
    expect(screen.getByRole('button', { name: 'Rating' })).toHaveAttribute('aria-expanded', 'true')
    // Rating bounds render trimmed onto the tag grid: 4 → "4", not "4.0".
    expect(screen.getByText('4 – 5 ★')).toBeInTheDocument()
  })

  it('shows "Any rating" when the Rating facet is opened without a bound', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Rating' }))
    expect(screen.getByText('Any rating')).toBeInTheDocument()
  })

  it('auto-expands the Release year facet when a bound is active and shows the range label', () => {
    renderPanel({ ...DEFAULT_FILTERS, yearMin: 1990 })
    expect(screen.getByRole('button', { name: 'Release year' })).toHaveAttribute('aria-expanded', 'true')
    // One-sided lower bound renders against the data extremes: 1990 – 2026.
    expect(screen.getByText('1990 – 2026')).toBeInTheDocument()
  })

  it('shows "Any year" when the Release year facet is opened without a bound', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Release year' }))
    expect(screen.getByText('Any year')).toBeInTheDocument()
  })

  it('emits a year bound when the min thumb is stepped up via keyboard', () => {
    const onChange = vi.fn()
    renderPanel(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByRole('button', { name: 'Release year' }))
    fireEvent.keyDown(screen.getByLabelText('Minimum year'), { key: 'ArrowRight' })
    // From the full data span [1940, 2026], stepping the min up by 1 → yearMin
    // 1941, yearMax cleared (2026 maps back to undefined = inactive upper bound).
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ yearMin: 1941, yearMax: undefined }))
  })

  it('toggles a format kind and emits updated filters', () => {
    const onChange = vi.fn()
    renderPanel(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    fireEvent.click(screen.getByLabelText('Trades (TPB)'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ format: ['tpb'] }))
  })

  it('toggles the mixed cleanup flag independently of the format kinds', () => {
    const onChange = vi.fn()
    renderPanel({ ...DEFAULT_FILTERS, format: ['singles'] }, onChange)
    // Auto-expanded via the active format selection.
    expect(screen.getByRole('button', { name: 'Format' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByLabelText('Mixed formats (cleanup)'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ format: ['singles'], formatMixed: true }))
  })

  it('auto-expands the Format facet when only the mixed flag is active', () => {
    renderPanel({ ...DEFAULT_FILTERS, formatMixed: true })
    expect(screen.getByRole('button', { name: 'Format' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('emits a rating bound when the min thumb is stepped up via keyboard', () => {
    const onChange = vi.fn()
    renderPanel(DEFAULT_FILTERS, onChange)
    fireEvent.click(screen.getByRole('button', { name: 'Rating' }))
    fireEvent.keyDown(screen.getByLabelText('Minimum rating'), { key: 'ArrowRight' })
    // From the full range [1, 5], stepping the min up by 0.5 → ratingMin 1.5,
    // ratingMax cleared (5 maps back to undefined = inactive upper bound).
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ratingMin: 1.5, ratingMax: undefined }))
  })

  it('commits typed year bounds as a point range (GENAU 1986)', () => {
    const { log } = renderStatefulPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Release year' }))
    typeAndCommit('Year from', '1986')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ yearMin: 1986, yearMax: undefined }))
    typeAndCommit('Year to', '1986')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ yearMin: 1986, yearMax: 1986 }))
    expect(screen.getByText('1986 (exakt)')).toBeInTheDocument()
  })

  it('swaps typed bounds that cross (von > bis)', () => {
    const { log } = renderStatefulPanel({ ...DEFAULT_FILTERS, yearMin: 2019 })
    // Auto-opened via the active yearMin — no header click.
    typeAndCommit('Year to', '2010')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ yearMin: 2010, yearMax: 2019 }))
  })

  it('clears a bound via an emptied field and clamps years into the data span', () => {
    const { log } = renderStatefulPanel({ ...DEFAULT_FILTERS, yearMin: 1990, yearMax: 2000 })
    typeAndCommit('Year from', '')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ yearMin: undefined, yearMax: 2000 }))
    // Data span is [1940, 2026]: 3000 clamps to 2026.
    typeAndCommit('Year to', '3000')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ yearMin: undefined, yearMax: 2026 }))
  })

  it('reverts junk year input without emitting', () => {
    const { log } = renderStatefulPanel({ ...DEFAULT_FILTERS, yearMin: 1990 })
    fireEvent.change(screen.getByLabelText('Year to'), { target: { value: '199x' } })
    fireEvent.keyDown(screen.getByLabelText('Year to'), { key: 'Enter' })
    expect(log).not.toHaveBeenCalled()
    // The draft is dropped and the field falls back to the bound-less display.
    expect(screen.getByLabelText('Year to')).toHaveValue('')
  })

  it('commits typed rating bounds snapped onto the 0.05 tag grid', () => {
    const { log } = renderStatefulPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Rating' }))
    typeAndCommit('Rating from', '4.13')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ ratingMin: 4.15, ratingMax: undefined }))
    typeAndCommit('Rating to', '4.15')
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ ratingMin: 4.15, ratingMax: 4.15 }))
    expect(screen.getByText('4.15 ★ (exakt)')).toBeInTheDocument()
  })

  // A render cap used to hide the tail of the alphabet: the live library has 143
  // publishers, so everything from "N" on was browsable only by name-guessing.
  it('renders every publisher, not just the first hundred', () => {
    referential.publishers = Array.from({ length: 143 }, (_, i) => `Pub ${String(i).padStart(3, '0')}`)
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Publisher' }))
    expect(screen.getByLabelText('Pub 142')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Pub \d{3}$/)).toHaveLength(143)
  })

  it('renders every genre, not just the first hundred', () => {
    referential.genres = Array.from({ length: 120 }, (_, i) => `Genre ${String(i).padStart(3, '0')}`)
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Genre' }))
    expect(screen.getByLabelText('Genre 119')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Genre \d{3}$/)).toHaveLength(120)
  })

  it('still narrows the publisher list by the search box', () => {
    referential.publishers = ['Image', 'Dark Horse', 'Oni Press']
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Publisher' }))
    fireEvent.change(screen.getByPlaceholderText(/search publishers/i), { target: { value: 'oni' } })
    expect(screen.getByLabelText('Oni Press')).toBeInTheDocument()
    expect(screen.queryByLabelText('Image')).not.toBeInTheDocument()
  })
})
