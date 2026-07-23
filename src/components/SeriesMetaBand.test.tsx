import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

function book(n: number, pages: number): KomgaBookDto {
  return {
    id: `b${n}`, seriesId: 's1', seriesTitle: 'Neonomicon', name: `Vol ${n}`,
    media: { pagesCount: pages },
    metadata: { title: `Part ${n}`, number: String(n), numberSort: n, releaseDate: '2010-08-01', summary: '' },
    readProgress: null,
  }
}
const books = [book(1, 27), book(2, 30), book(3, 27), book(4, 27)]

const renderBand = (d = dto(), b = books) =>
  render(<MemoryRouter><SeriesMetaBand dto={d} books={b} /></MemoryRouter>)

describe('SeriesMetaBand', () => {
  it('renders credit blocks with role labels', () => {
    renderBand()
    expect(screen.getByText('Writer')).toBeInTheDocument()
    expect(screen.getByText('Alan Moore')).toBeInTheDocument()
    expect(screen.getByText('Art')).toBeInTheDocument()
    expect(screen.getByText('Jacen Burrows')).toBeInTheDocument()
    expect(screen.getByText('Colors')).toBeInTheDocument()
    expect(screen.getByText('Mark Seifert +1')).toBeInTheDocument()
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

  it('merges + dedupes tags across series and books, hiding rating tags', () => {
    renderBand()
    expect(screen.getByText('variant cover')).toBeInTheDocument()
    expect(screen.getByText('sexual violence')).toBeInTheDocument()
    expect(screen.queryByText(/rating:/)).not.toBeInTheDocument()
    expect(screen.getAllByText('variant cover')).toHaveLength(1)
  })

  it('renders nothing at all when there is no data', () => {
    const empty = dto({ publisher: '', tags: [] }, [])
    empty.booksMetadata.tags = []
    const { container } = renderBand(empty, [])
    expect(container.firstChild).toBeNull()
  })
})
