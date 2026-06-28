import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { KomgaSeriesDto, KomgaBookDto, KomgaPage } from '@/lib/komga/types'
import { mockViewport } from '@/test/viewport'

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

const { markSeriesMutate, markBookMutate } = vi.hoisted(() => ({
  markSeriesMutate: vi.fn(), markBookMutate: vi.fn(),
}))
vi.mock('@/lib/komga/mutations', () => ({
  useMarkSeries: () => ({ mutate: markSeriesMutate, isPending: false }),
  useMarkBook: () => ({ mutate: markBookMutate, isPending: false }),
  useAddToReadList: () => ({ mutate: vi.fn() }),
}))

const { backSpy } = vi.hoisted(() => ({ backSpy: vi.fn() }))
vi.mock('@/hooks/useSmartBack', () => ({ useSmartBack: () => backSpy }))

const { triggerDownloadSpy } = vi.hoisted(() => ({ triggerDownloadSpy: vi.fn() }))
vi.mock('@/lib/download', () => ({ triggerDownload: triggerDownloadSpy }))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear() // reset the persisted Books view so each test starts at the default
})
afterEach(() => vi.unstubAllGlobals())

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

  it('defaults to the card view; switching to List reveals the table', async () => {
    const user = userEvent.setup()
    renderDetail()
    // card view by default → no per-row table action menu
    expect(screen.queryByRole('button', { name: 'Volume 1 actions' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByRole('button', { name: 'Volume 1 actions' })).toBeInTheDocument()
  })

  it('Continue reading deep-links into the Komga reader at the in-progress book', () => {
    renderDetail()
    const cta = screen.getByRole('link', { name: /Continue reading/ })
    expect(cta).toHaveAttribute('href', 'https://komga.p2lab.com/book/b2/read')
  })

  it('hero action marks the whole (unfinished) series read', () => {
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: true })
  })

  it('a per-row menu marks an unread volume read (list view)', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(screen.getByRole('button', { name: 'List' }))
    await user.click(screen.getByRole('button', { name: 'Volume 3 actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark read' }))
    expect(markBookMutate).toHaveBeenCalledWith({ bookId: 'b3', read: true })
  })

  it('a per-row menu marks a read volume unread (list view)', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(screen.getByRole('button', { name: 'List' }))
    await user.click(screen.getByRole('button', { name: 'Volume 1 actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark unread' }))
    expect(markBookMutate).toHaveBeenCalledWith({ bookId: 'b1', read: false })
  })

  it('a per-row menu downloads the volume file (list view)', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(screen.getByRole('button', { name: 'List' }))
    await user.click(screen.getByRole('button', { name: 'Volume 2 actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Download' }))
    expect(triggerDownloadSpy).toHaveBeenCalledWith('/komga/api/v1/books/b2/file')
  })

  it('forces the Books card view and hides the view toggle on mobile', () => {
    mockViewport(true)
    renderDetail()
    // toggle is gone…
    expect(screen.queryByRole('button', { name: 'List' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Card' })).not.toBeInTheDocument()
    // …and the dense table (its per-row action menus) is not rendered
    expect(screen.queryByRole('button', { name: 'Volume 1 actions' })).not.toBeInTheDocument()
    // card view content is present
    expect(screen.getByText('Volume 1')).toBeInTheDocument()
  })

  it('the breadcrumb library name links to that library, freshly scoped', () => {
    renderDetail()
    const link = screen.getByRole('link', { name: 'Comics' }) // prettyLibraryName('xCat:Fra Comics')
    expect(link).toHaveAttribute('href', '/?library=l1')
  })

  it('the back button invokes smart back', () => {
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: 'Back to library' }))
    expect(backSpy).toHaveBeenCalledTimes(1)
  })
})
