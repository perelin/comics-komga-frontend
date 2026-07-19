import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { mockViewport } from '@/test/viewport'
import { BookCard } from './BookCard'
import type { KomgaBookDto } from '@/lib/komga/types'

const { markBookMutate } = vi.hoisted(() => ({ markBookMutate: vi.fn() }))
vi.mock('@/lib/komga/mutations', () => ({
  useMarkBook: () => ({ mutate: markBookMutate, isPending: false }),
}))

const { triggerDownloadSpy } = vi.hoisted(() => ({ triggerDownloadSpy: vi.fn() }))
vi.mock('@/lib/download', () => ({ triggerDownload: triggerDownloadSpy }))

function book(progress: KomgaBookDto['readProgress'], pages = 100): KomgaBookDto {
  return {
    id: 'b1', seriesId: 's1', seriesTitle: 'The Walking Dead', name: 'Vol 3',
    media: { pagesCount: pages },
    metadata: { title: 'Days Gone Bye', number: '3', numberSort: 3, releaseDate: '2004-05-01', summary: '' },
    readProgress: progress,
  }
}
const read = book({ page: 100, completed: true, readDate: '2026-01-01' })
const inProgress = book({ page: 62, completed: false, readDate: '2026-01-01' })
const unread = book(null)

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('BookCard', () => {
  it('shows the volume number, title, and a reader deep-link', () => {
    render(<BookCard book={unread} seriesId="s1" />)
    expect(screen.getByText(/Vol\. 3/)).toBeInTheDocument()
    expect(screen.getByText('Days Gone Bye')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/book/b1/read'))
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders the book cover', () => {
    render(<BookCard book={unread} seriesId="s1" />)
    expect(screen.getByRole('img')).toHaveAttribute('src', '/komga/api/v1/books/b1/thumbnail')
  })

  it('marks an unread book read without navigating', () => {
    render(<BookCard book={unread} seriesId="s1" />)
    expect(screen.queryByTestId('book-read')).not.toBeInTheDocument()
    expect(screen.queryByTestId('book-progress')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    expect(markBookMutate).toHaveBeenCalledWith({ bookId: 'b1', read: true })
  })

  it('shows a read indicator and marks a read book unread', () => {
    render(<BookCard book={read} seriesId="s1" />)
    expect(screen.getByTestId('book-read')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark unread' }))
    expect(markBookMutate).toHaveBeenCalledWith({ bookId: 'b1', read: false })
  })

  it('downloads the book file without navigating', () => {
    render(<BookCard book={unread} seriesId="s1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(triggerDownloadSpy).toHaveBeenCalledWith('/komga/api/v1/books/b1/file')
  })

  it('renders no hover quick-actions on mobile', () => {
    mockViewport(true)
    render(<BookCard book={unread} seriesId="s1" />)
    expect(screen.getByText('Days Gone Bye')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument()
  })

  it('shows the read percentage for an in-progress book', () => {
    render(<BookCard book={inProgress} seriesId="s1" />)
    expect(screen.getByTestId('book-progress')).toHaveTextContent('62')
  })
})

describe('BookCard — linkTarget="series" (flat Issues browse)', () => {
  function CurrentPath() {
    return <div data-testid="path">{useLocation().pathname}</div>
  }
  function renderSeriesCard(b = unread) {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<BookCard book={b} seriesId="s1" linkTarget="series" />} />
          <Route path="/series/:id" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('links the whole card to the parent series (not the reader)', () => {
    renderSeriesCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/series/s1')
    expect(link).not.toHaveAttribute('target')
  })

  it('leads with the series title', () => {
    renderSeriesCard()
    expect(screen.getByText('The Walking Dead')).toBeInTheDocument()
    expect(screen.getByText(/Vol\. 3/)).toBeInTheDocument()
  })

  it('navigates to the series when the card is clicked', () => {
    renderSeriesCard()
    fireEvent.click(screen.getByRole('link'))
    expect(screen.getByTestId('path')).toHaveTextContent('/series/s1')
  })

  it('opens the reader via the Play button without navigating to the series', () => {
    const openSpy = vi.fn()
    vi.stubGlobal('open', openSpy)
    renderSeriesCard()
    fireEvent.click(screen.getByRole('button', { name: 'Read' }))
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/book/b1/read'), '_blank', 'noopener,noreferrer')
    // still on the browse route — the Play click did not follow the series link
    expect(screen.queryByTestId('path')).not.toBeInTheDocument()
  })

  it('marks read without navigating in series mode', () => {
    renderSeriesCard()
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    expect(markBookMutate).toHaveBeenCalledWith({ bookId: 'b1', read: true })
    expect(screen.queryByTestId('path')).not.toBeInTheDocument()
  })
})
