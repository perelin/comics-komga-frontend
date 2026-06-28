import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    id: 'b1', seriesId: 's1', name: 'Vol 3',
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
