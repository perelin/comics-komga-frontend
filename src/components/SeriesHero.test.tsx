import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SeriesHero } from './SeriesHero'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

const { markSeriesMutate } = vi.hoisted(() => ({ markSeriesMutate: vi.fn() }))
vi.mock('@/lib/komga/mutations', () => ({
  useMarkSeries: () => ({ mutate: markSeriesMutate, isPending: false }),
  useAddToReadList: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: [] }),
}))

/** jsdom has no layout, so scrollHeight/clientHeight are always 0. Stub the
 *  prototype getters so the overflow-measurement effect in SeriesHero sees
 *  a deterministic clamped/overflowing (or non-overflowing) paragraph. */
function stubOverflow(overflowing: boolean) {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true, get: () => (overflowing ? 200 : 80),
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true, get: () => 80,
  })
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollHeight')
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
})

const LONG = 'x'.repeat(400)

function dto(over: Partial<KomgaSeriesDto['metadata']> = {}, bmOver: Partial<KomgaSeriesDto['booksMetadata']> = {}): KomgaSeriesDto {
  return {
    id: 's1', libraryId: 'lib1', name: 'Neonomicon', oneshot: false,
    booksCount: 4, booksReadCount: 0, booksUnreadCount: 4, booksInProgressCount: 0,
    metadata: {
      status: 'ONGOING', title: "Alan Moore's Neonomicon", titleSort: 'Neonomicon',
      summary: '', publisher: 'Avatar Press', genres: [], tags: ['rating:3.45'],
      links: [{ label: '★ 3.46 · Goodreads (7.2k)', url: 'https://gr.example/x' }],
      ageRating: null, language: '', readingDirection: '', totalBookCount: 4,
      ...over,
    },
    booksMetadata: {
      authors: [{ name: 'Alan Moore', role: 'writer' }, { name: 'Jacen Burrows', role: 'penciller' }],
      releaseDate: '2010-08-01', tags: [], summary: LONG, summaryNumber: '1',
      ...bmOver,
    },
    created: '', lastModified: '',
  }
}

function book(n: number, pages: number, date: string): KomgaBookDto {
  return {
    id: `b${n}`, seriesId: 's1', seriesTitle: 'Neonomicon', name: `Vol ${n}`,
    media: { pagesCount: pages },
    metadata: { title: `Part ${n}`, number: String(n), numberSort: n, releaseDate: date, summary: '' },
    readProgress: null,
  }
}
const books = [book(1, 27, '2010-08-01'), book(2, 30, '2010-10-01'), book(3, 27, '2010-12-01'), book(4, 27, '2011-02-01')]

function renderHero(d = dto(), b = books) {
  return render(<MemoryRouter><SeriesHero dto={d} books={b} /></MemoryRouter>)
}

describe('SeriesHero', () => {
  it('shows the fallback summary with its source-book label', () => {
    renderHero()
    expect(screen.getByText('Summary · from Vol. 1')).toBeInTheDocument()
  })

  it('labels a series-own summary plainly and expands on Read more when it overflows', () => {
    stubOverflow(true)
    renderHero(dto({ summary: LONG }))
    expect(screen.getByText('Summary')).toBeInTheDocument()
    const p = screen.getByText(LONG)
    expect(p.className).toContain('line-clamp-4')
    fireEvent.click(screen.getByRole('button', { name: /read more/i }))
    expect(p.className).not.toContain('line-clamp-4')
    fireEvent.click(screen.getByRole('button', { name: /show less/i }))
    expect(p.className).toContain('line-clamp-4')
  })

  it('shows no toggle when the summary does not overflow 4 clamped lines', () => {
    stubOverflow(false)
    renderHero(dto({ summary: 'A short summary that fits within four lines.' }))
    expect(screen.getByText('A short summary that fits within four lines.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /read more/i })).not.toBeInTheDocument()
  })

  it('renders no summary block when there is nothing to show', () => {
    renderHero(dto({}, { summary: '', summaryNumber: '' }))
    expect(screen.queryByText(/^Summary/)).not.toBeInTheDocument()
  })

  it('renders every metadata link as an external pill', () => {
    renderHero()
    const pill = screen.getByRole('link', { name: /Goodreads \(7\.2k\)/ })
    expect(pill).toHaveAttribute('href', 'https://gr.example/x')
    expect(pill).toHaveAttribute('target', '_blank')
  })

  it('byline shows the year range and the summed pages', () => {
    renderHero()
    expect(screen.getByText(/2010–2011/)).toBeInTheDocument()
    expect(screen.getByText(/111 pages/)).toBeInTheDocument()
  })

  it('keeps the mark-all-read action working', () => {
    renderHero()
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: true })
  })

  it('renders no backdrop when the series has no books', () => {
    const { container } = renderHero(dto(), [])
    expect(container.querySelector('[aria-hidden].absolute.inset-0.overflow-hidden')).not.toBeInTheDocument()
  })
})
