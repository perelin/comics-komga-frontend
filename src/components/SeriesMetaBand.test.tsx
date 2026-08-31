import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SeriesMetaBand } from './SeriesMetaBand'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

function dto(over: Partial<KomgaSeriesDto['metadata']> = {}, authors = [
  { name: 'Alan Moore', role: 'writer' },
  { name: 'Jacen Burrows', role: 'penciller' },
  { name: 'Juanmar', role: 'colorist' },
  { name: 'Mark Seifert', role: 'editor' },
  { name: 'William Christensen', role: 'editor' },
]): KomgaSeriesDto {
  return {
    id: 's1', libraryId: 'lib1', name: 'Neonomicon', oneshot: false,
    booksCount: 4, booksReadCount: 0, booksUnreadCount: 4, booksInProgressCount: 0,
    metadata: {
      status: 'ONGOING', title: 'Neonomicon', titleSort: 'Neonomicon', summary: '',
      publisher: 'Avatar Press', genres: [], tags: ['rating:3.45', 'variant cover'],
      links: [], ageRating: null, language: '', readingDirection: '', totalBookCount: 4,
      ...over,
    },
    booksMetadata: { authors, releaseDate: '2010-08-01', tags: ['sexual violence', 'variant cover'], summary: '', summaryNumber: '' },
    created: '', lastModified: '',
  }
}

function book(n: number, pages: number, authors: { name: string; role: string }[] = []): KomgaBookDto {
  return {
    id: `b${n}`, seriesId: 's1', seriesTitle: 'Neonomicon', name: `Vol ${n}`,
    media: { pagesCount: pages },
    metadata: { title: `Part ${n}`, number: String(n), numberSort: n, releaseDate: '2010-08-01', summary: '', authors },
    readProgress: null,
  }
}
const books = [book(1, 27), book(2, 30), book(3, 27), book(4, 27)]

const renderBand = (d = dto(), b = books) =>
  render(<MemoryRouter><SeriesMetaBand dto={d} books={b} /></MemoryRouter>)

describe('SeriesMetaBand', () => {
  it('renders credit blocks with role labels and a per-role count', () => {
    renderBand()
    expect(screen.getByText('Writer')).toBeInTheDocument()
    expect(screen.getByText('Alan Moore')).toBeInTheDocument()
    expect(screen.getByText('Art')).toBeInTheDocument()
    expect(screen.getByText('Jacen Burrows')).toBeInTheDocument()
    expect(screen.getByText('Colors')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // editor count
  })

  it('lists every credited name — no "+N" cap, no truncation', () => {
    renderBand()
    expect(screen.getByRole('link', { name: 'Mark Seifert' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'William Christensen' })).toBeInTheDocument()
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument()
  })

  it('links every credited name to the authors facet', () => {
    renderBand()
    const authorLinks = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href')?.includes('authors='))
    expect(authorLinks.map((l) => l.textContent)).toEqual([
      'Alan Moore', 'Jacen Burrows', 'Juanmar', 'Mark Seifert', 'William Christensen',
    ])
  })

  it('writer and publisher link to freshly-scoped filtered lists', () => {
    renderBand()
    expect(screen.getByRole('link', { name: 'Alan Moore' })).toHaveAttribute('href', expect.stringContaining('authors='))
    expect(screen.getByRole('link', { name: 'Avatar Press' })).toHaveAttribute('href', expect.stringContaining('publisher='))
  })

  it('derives the format block from the books', () => {
    renderBand()
    expect(screen.getByText('4 issues · ⌀ 28 p. · Floppies')).toBeInTheDocument()
  })

  it('omits empty blocks', () => {
    renderBand(dto({}, [{ name: 'Alan Moore', role: 'writer' }]))
    expect(screen.queryByText('Colors')).not.toBeInTheDocument()
    expect(screen.queryByText('Editor')).not.toBeInTheDocument()
  })

  it('merges + dedupes every tag across series and books, convention tags included', () => {
    renderBand(dto({ tags: ['rating:3.45', 'format:singles', 'format:mixed', 'variant cover'] }))
    expect(screen.getByText('variant cover')).toBeInTheDocument()
    expect(screen.getByText('sexual violence')).toBeInTheDocument()
    expect(screen.getByText('rating:3.45')).toBeInTheDocument()
    expect(screen.getByText('format:singles')).toBeInTheDocument()
    expect(screen.getByText('format:mixed')).toBeInTheDocument()
    expect(screen.getAllByText('variant cover')).toHaveLength(1)
  })

  it('shows the convention tags even when they are the only tags (the Alex + Ada case)', () => {
    const d = dto({ tags: ['format:mixed', 'rating:nomatch', 'format:singles'] })
    d.booksMetadata.tags = []
    renderBand(d)
    expect(screen.getByText('format:mixed')).toBeInTheDocument()
    expect(screen.getByText('format:singles')).toBeInTheDocument()
    expect(screen.getByText('rating:nomatch')).toBeInTheDocument()
  })

  it('ranks credits by issue count and shows the tally for regulars', () => {
    const credited = (n: number, authors: { name: string; role: string }[]) => book(n, 27, authors)
    renderBand(dto(), [
      credited(1, [{ name: 'Jacen Burrows', role: 'penciller' }, { name: 'Mark Seifert', role: 'editor' }]),
      credited(2, [{ name: 'Jacen Burrows', role: 'penciller' }, { name: 'Mark Seifert', role: 'editor' }, { name: 'William Christensen', role: 'editor' }]),
      credited(3, [{ name: 'Jacen Burrows', role: 'penciller' }, { name: 'Mark Seifert', role: 'editor' }, { name: 'William Christensen', role: 'editor' }]),
    ])
    // Stamm-Crew trägt ihre Heftzahl, Namen ohne Count sind Einzel-Credits.
    expect(screen.getAllByText('(3)')).toHaveLength(2) // Jacen Burrows, Mark Seifert
    expect(screen.getByText('(2)')).toBeInTheDocument() // William Christensen
    expect(screen.queryByText('(1)')).not.toBeInTheDocument()
    // Editor-Rangfolge: mehr Hefte zuerst (nicht DTO-Reihenfolge).
    const editorCard = screen.getByText('Editor').parentElement as HTMLElement
    expect(within(editorCard).getAllByRole('link').map((l) => l.textContent))
      .toEqual(['Mark Seifert', 'William Christensen'])
  })

  it('shows no tallies when the volumes carry no per-issue author metadata', () => {
    renderBand(dto(), books)
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
  })

  it('links format tags to their filter and leaves rating/free-form tags inert', () => {
    renderBand(dto({ tags: ['format:singles', 'format:mixed', 'rating:nomatch', 'variant cover'] }))
    expect(screen.getByRole('link', { name: 'format:singles' })).toHaveAttribute('href', '/?format=singles')
    expect(screen.getByRole('link', { name: 'format:mixed' })).toHaveAttribute('href', '/?mixed=true')
    expect(screen.queryByRole('link', { name: 'rating:nomatch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'variant cover' })).not.toBeInTheDocument()
  })

  it('lets the format:* tag override the heuristic format block, with the mixed flag', () => {
    renderBand(dto({ tags: ['format:singles', 'format:mixed'] }))
    expect(screen.getByText('4 issues · ⌀ 28 p. · Singles · mixed')).toBeInTheDocument()
  })

  it('renders genre chips, sorted, each linking to the genre facet', () => {
    renderBand(dto({ genres: ['Science Fiction', 'Fantasy'] }))
    const chips = screen.getAllByRole('link', { name: /Fantasy|Science Fiction/ })
    expect(chips.map((c) => c.textContent)).toEqual(['Fantasy', 'Science Fiction'])
    expect(chips[0]).toHaveAttribute('href', '/?genre=Fantasy')
  })

  it('still renders the band when genres are the only chip data', () => {
    const d = dto({ publisher: '', genres: ['horror'], tags: [] }, [])
    d.booksMetadata.tags = []
    renderBand(d, [])
    expect(screen.getByRole('link', { name: 'horror' })).toBeInTheDocument()
  })

  it('renders nothing at all when there is no data', () => {
    const empty = dto({ publisher: '', genres: [], tags: [] }, [])
    empty.booksMetadata.tags = []
    const { container } = renderBand(empty, [])
    expect(container.firstChild).toBeNull()
  })
})
