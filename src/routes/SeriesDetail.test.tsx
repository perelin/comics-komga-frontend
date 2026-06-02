import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { KomgaSeriesDto, KomgaBookDto, KomgaPage } from '@/lib/komga/types'

const seriesDto: KomgaSeriesDto = {
  id: 's1', libraryId: 'l1', name: 'Saga', oneshot: false,
  booksCount: 3, booksReadCount: 1, booksUnreadCount: 1, booksInProgressCount: 1,
  metadata: {
    status: 'ONGOING', title: 'Saga', titleSort: 'Saga',
    summary: 'Two soldiers from opposite sides of a war fall in love.',
    publisher: 'Image', genres: ['Science Fiction', 'Fantasy'],
    tags: ['rating:4.2', 'space-opera'], links: [], ageRating: 16,
    language: 'en', readingDirection: '', totalBookCount: 12,
  },
  booksMetadata: { authors: [{ name: 'Brian K. Vaughan', role: 'writer' }], releaseDate: '2012-03-14', tags: [] },
  created: '', lastModified: '',
}
function book(n: number, rp: KomgaBookDto['readProgress']): KomgaBookDto {
  return {
    id: `b${n}`, seriesId: 's1', name: `Vol ${n}`, media: { pagesCount: 168 },
    metadata: { title: `Volume ${n}`, number: String(n), numberSort: n, releaseDate: '2012-03-14', summary: '' },
    readProgress: rp,
  }
}
const books: KomgaPage<KomgaBookDto> = {
  content: [
    book(1, { page: 168, completed: true, readDate: '2026-01-01' }),
    book(2, { page: 42, completed: false, readDate: '2026-01-02' }),
    book(3, null),
  ],
  totalElements: 3, totalPages: 1, number: 0, size: 400, first: true, last: true,
}

vi.mock('@/lib/komga/queries', () => ({
  useSeries: () => ({ data: seriesDto, isLoading: false, isError: false }),
  useSeriesBooks: () => ({ data: books, isLoading: false }),
  useRelatedByPublisher: () => ({ data: [], isLoading: false }),
  useLibraries: () => ({ data: [{ id: 'l1', name: 'xCat:Fra Comics' }], isLoading: false }),
}))

function renderDetail() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/series/s1']}>
        <Routes>
          <Route path="/series/:id" element={<SeriesDetailUnderTest />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
// imported after vi.mock so the mock is in place
import { SeriesDetail as SeriesDetailUnderTest } from './SeriesDetail'

describe('SeriesDetail', () => {
  it('renders the hero with title, author and publisher', () => {
    renderDetail()
    expect(screen.getByRole('heading', { name: 'Saga' })).toBeInTheDocument()
    expect(screen.getByText('Brian K. Vaughan')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
  })

  it('offers Books / Related / Metadata tabs', () => {
    renderDetail()
    expect(screen.getByRole('tab', { name: /Books/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Related/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Metadata/ })).toBeInTheDocument()
  })

  it('lists the volumes in the default Books tab', () => {
    renderDetail()
    expect(screen.getByText('Volume 1')).toBeInTheDocument()
    expect(screen.getByText('Volume 3')).toBeInTheDocument()
  })

  it('Continue reading deep-links into the Komga reader at the in-progress book', () => {
    renderDetail()
    const cta = screen.getByRole('link', { name: /Continue reading/ })
    expect(cta).toHaveAttribute('href', 'https://komga.p2lab.com/book/b2/read')
  })
})
