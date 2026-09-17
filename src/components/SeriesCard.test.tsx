import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockViewport } from '@/test/viewport'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SeriesCard } from './SeriesCard'
import { SeriesRow } from './SeriesRow'
import type { SeriesVM } from '@/lib/komga/mapping'

const { markSeriesMutate } = vi.hoisted(() => ({ markSeriesMutate: vi.fn() }))
vi.mock('@/lib/komga/mutations', () => ({
  useMarkSeries: () => ({ mutate: markSeriesMutate, isPending: false }),
}))
vi.mock('@/lib/komga/queries', () => ({
  useSeriesPages: () => ({ data: 8340 }),
}))

const vm: SeriesVM = {
  id: 's1', title: 'Saga', author: 'BKV', authorNames: ['BKV'], publisher: 'Image', status: 'ONGOING',
  genres: ['Science Fiction'], language: 'en', ageRating: 16, oneshot: false,
  progress: { read: 7, inProgress: 1, unread: 3, total: 11 },
  rating: { value: 4.2, needsCheck: false },
  coverUrl: '/komga/api/v1/series/s1/thumbnail', year: '2012',
  credits: [{ name: 'Fiona Staples', role: 'colorist' }, { name: 'BKV', role: 'writer' }, { name: 'Fiona Staples', role: 'penciller' }],
}
const doneVm: SeriesVM = { ...vm, progress: { read: 11, inProgress: 0, unread: 0, total: 11 } }

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

function renderCard(s: SeriesVM, matchedCreators?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SeriesCard s={s} matchedCreators={matchedCreators} />} />
        <Route path="/series/:id" element={<div>SERIES PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SeriesCard / SeriesRow', () => {
  it('card shows title + author', () => {
    renderCard(vm)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.getByText('BKV')).toBeInTheDocument()
  })
  it('card shows release year and total pages', () => {
    renderCard(vm)
    expect(screen.getByText('2012 · 8,340 pp')).toBeInTheDocument()
  })
  it('card shows a format badge when the series is format-tagged', () => {
    renderCard({ ...vm, format: { kind: 'tpb', mixed: false } })
    expect(screen.getByText('TPB')).toBeInTheDocument()
  })
  it('card shows no format badge for an untagged series', () => {
    renderCard(vm)
    expect(screen.queryByText('TPB')).not.toBeInTheDocument()
  })
  it('row shows title, publisher, and rating value', () => {
    render(<MemoryRouter><SeriesRow s={vm} /></MemoryRouter>)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.getByText('4.20')).toBeInTheDocument()
  })
  it('clicking a publisher in the row filters the list to that publisher', () => {
    const LocationProbe = () => <div data-testid="loc">{useLocation().pathname + useLocation().search}</div>
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationProbe />
        <SeriesRow s={vm} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Image' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/?publisher=Image')
  })
  it('row shows release year and total pages columns', () => {
    render(<MemoryRouter><SeriesRow s={vm} /></MemoryRouter>)
    expect(screen.getByText('2012')).toBeInTheDocument()
    expect(screen.getByText('8,340 pp')).toBeInTheDocument()
  })

  it('clicking the author filters the list to that author, without opening the series', () => {
    const LocationProbe = () => <div data-testid="loc">{useLocation().pathname + useLocation().search}</div>
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationProbe />
        <SeriesCard s={vm} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'BKV' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/?authors=BKV')
    expect(screen.queryByText('SERIES PAGE')).not.toBeInTheDocument()
  })

  it('shows up to two writers and links only to the first', () => {
    const multi: SeriesVM = { ...vm, author: 'Greg Tocchini, Rick Remender', authorNames: ['Greg Tocchini', 'Rick Remender'] }
    const LocationProbe = () => <div data-testid="loc">{useLocation().pathname + useLocation().search}</div>
    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationProbe />
        <SeriesCard s={multi} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Greg Tocchini, Rick Remender')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Greg Tocchini, Rick Remender' }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/?authors=Greg+Tocchini')
  })

  it('quick-action marks an unfinished series read without navigating', () => {
    renderCard(vm)
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: true })
    expect(screen.queryByText('SERIES PAGE')).not.toBeInTheDocument()
  })

  it('renders no hover quick-actions on mobile', () => {
    mockViewport(true)
    renderCard(vm)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument()
  })

  it('quick-action marks a fully-read series unread', () => {
    renderCard(doneVm)
    fireEvent.click(screen.getByRole('button', { name: 'Mark all unread' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: false })
    expect(screen.queryByText('SERIES PAGE')).not.toBeInTheDocument()
  })

  it('row quick-action marks an unfinished series read without navigating', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SeriesRow s={vm} />} />
          <Route path="/series/:id" element={<div>SERIES PAGE</div>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: true })
    expect(screen.queryByText('SERIES PAGE')).not.toBeInTheDocument()
  })

  it('row quick-action marks a fully-read series unread', () => {
    render(<MemoryRouter><SeriesRow s={doneVm} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mark all unread' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: false })
  })
})

describe('SeriesCard / SeriesRow — creator match chips', () => {
  it('card shows no chips without an active creator filter', () => {
    renderCard(vm)
    expect(screen.queryByText('Fiona Staples')).not.toBeInTheDocument()
  })
  it('card shows the searched creator with the roles they hold here, canonically ordered', () => {
    renderCard(vm, ['Fiona Staples'])
    expect(screen.getByText('Fiona Staples')).toBeInTheDocument()
    // colorist + penciller credits collapse into one canonical-order chip
    expect(screen.getByText('penciller · colorist')).toBeInTheDocument()
  })
  it('card chip is the dimmed dashed variant for a cover-only match', () => {
    const coverOnly: SeriesVM = { ...vm, credits: [{ name: 'Fiona Staples', role: 'cover' }] }
    renderCard(coverOnly, ['Fiona Staples'])
    expect(screen.getByText('cover')).toBeInTheDocument()
  })
  it('card shows one chip per selected creator, in selection order', () => {
    renderCard(vm, ['BKV', 'Fiona Staples'])
    expect(screen.getByText('writer')).toBeInTheDocument()
    expect(screen.getByText('penciller · colorist')).toBeInTheDocument()
  })
  it('row shows the match as a second mini line under the author', () => {
    render(<MemoryRouter><SeriesRow s={vm} matchedCreators={['Fiona Staples']} /></MemoryRouter>)
    expect(screen.getByText('penciller · colorist')).toBeInTheDocument()
  })
  it('a selected creator without credits in the series gets no chip', () => {
    renderCard(vm, ['Chip Zdarsky'])
    expect(screen.queryByText('Chip Zdarsky')).not.toBeInTheDocument()
  })
})
