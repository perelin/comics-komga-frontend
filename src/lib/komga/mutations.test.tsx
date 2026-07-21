import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { komga } from './client'
import { toast } from 'sonner'
import { useMarkBook, useMarkSeries, useUpdateReadList, useDeleteReadList, useAddToReadList } from './mutations'
import type { KomgaBookDto, KomgaSeriesDto, KomgaPage, KomgaReadListDto } from './types'

vi.mock('./client', () => ({
  komga: {
    markBookRead: vi.fn(),
    markBookUnread: vi.fn(),
    markSeriesRead: vi.fn(),
    markSeriesUnread: vi.fn(),
    readLists: vi.fn(),
    readList: vi.fn(),
    readListBooks: vi.fn(),
    seriesBooks: vi.fn(),
    createReadList: vi.fn(),
    updateReadList: vi.fn(),
    deleteReadList: vi.fn(),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

type RP = KomgaBookDto['readProgress']
const book = (id: string, rp: RP = null): KomgaBookDto => ({
  id, seriesId: 's1', seriesTitle: 'Series', name: id,
  media: { pagesCount: 20 },
  metadata: { title: id, number: id, numberSort: 1, releaseDate: null, summary: '' },
  readProgress: rp,
})
const booksPage = (books: KomgaBookDto[]): KomgaPage<KomgaBookDto> => ({
  content: books, totalElements: books.length, totalPages: 1, number: 0, size: books.length, first: true, last: true,
})
const series = (over: Partial<KomgaSeriesDto> = {}): KomgaSeriesDto => ({
  id: 's1', libraryId: 'l1', name: 'S', oneshot: false,
  booksCount: 3, booksReadCount: 0, booksUnreadCount: 3, booksInProgressCount: 0,
  metadata: {
    status: 'ONGOING', title: 'S', titleSort: 'S', summary: '', publisher: '',
    genres: [], tags: [], links: [], ageRating: null, language: '', readingDirection: '', totalBookCount: 3,
  },
  booksMetadata: { authors: [], releaseDate: null, tags: [], summary: '', summaryNumber: '' }, created: '', lastModified: '',
  ...over,
})
const seriesListData = (list: KomgaSeriesDto[]): InfiniteData<KomgaPage<KomgaSeriesDto>> => ({
  pages: [{ content: list, totalElements: list.length, totalPages: 1, number: 0, size: list.length, first: true, last: true }],
  pageParams: [0],
})

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, wrapper }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(komga.markBookRead).mockResolvedValue(undefined)
  vi.mocked(komga.markBookUnread).mockResolvedValue(undefined)
  vi.mocked(komga.markSeriesRead).mockResolvedValue(undefined)
  vi.mocked(komga.markSeriesUnread).mockResolvedValue(undefined)
})

describe('useMarkBook', () => {
  it('optimistically marks a book read and recounts the series', async () => {
    const { qc, wrapper } = setup()
    qc.setQueryData(['series', 's1', 'books'], booksPage([book('a'), book('b')]))
    qc.setQueryData(['series', 's1'], series({ booksCount: 2, booksUnreadCount: 2 }))

    const { result } = renderHook(() => useMarkBook('s1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ bookId: 'b', read: true }) })

    expect(komga.markBookRead).toHaveBeenCalledWith('b')
    const books = qc.getQueryData<KomgaPage<KomgaBookDto>>(['series', 's1', 'books'])!
    expect(books.content[1].readProgress?.completed).toBe(true)
    const s = qc.getQueryData<KomgaSeriesDto>(['series', 's1'])!
    expect(s).toMatchObject({ booksReadCount: 1, booksUnreadCount: 1 })
    expect(toast.success).toHaveBeenCalled()
  })

  it('rolls back the cache and toasts on error', async () => {
    const { qc, wrapper } = setup()
    vi.mocked(komga.markBookRead).mockRejectedValueOnce(new Error('boom'))
    qc.setQueryData(['series', 's1', 'books'], booksPage([book('a'), book('b')]))

    const { result } = renderHook(() => useMarkBook('s1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ bookId: 'b', read: true }).catch(() => {}) })

    const books = qc.getQueryData<KomgaPage<KomgaBookDto>>(['series', 's1', 'books'])!
    expect(books.content[1].readProgress).toBeNull()
    expect(toast.error).toHaveBeenCalled()
  })

  it('invalidates the whole series cache prefix after settling', async () => {
    const { qc, wrapper } = setup()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    qc.setQueryData(['series', 's1', 'books'], booksPage([book('a')]))

    const { result } = renderHook(() => useMarkBook('s1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ bookId: 'a', read: true }) })

    // A per-book change shifts the series' read count; the grid lists are NOT
    // optimistically patched here, so the broad prefix invalidation keeps them correct.
    expect(spy).toHaveBeenCalledWith({ queryKey: ['series'] })
  })
})

describe('useMarkSeries', () => {
  it('optimistically marks the whole series read across detail + list caches', async () => {
    const { qc, wrapper } = setup()
    qc.setQueryData(['series', 's1'], series({ booksCount: 3, booksUnreadCount: 3 }))
    qc.setQueryData(['series', 's1', 'books'], booksPage([book('a'), book('b'), book('c')]))
    qc.setQueryData(['series', { genre: [] }], seriesListData([series({ id: 's1', booksCount: 3 }), series({ id: 's2', booksCount: 5 })]))

    const { result } = renderHook(() => useMarkSeries(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ seriesId: 's1', read: true }) })

    expect(komga.markSeriesRead).toHaveBeenCalledWith('s1')
    expect(qc.getQueryData<KomgaSeriesDto>(['series', 's1'])).toMatchObject({ booksReadCount: 3, booksUnreadCount: 0 })
    const books = qc.getQueryData<KomgaPage<KomgaBookDto>>(['series', 's1', 'books'])!
    expect(books.content.every((b) => b.readProgress?.completed)).toBe(true)
    const list = qc.getQueryData<InfiniteData<KomgaPage<KomgaSeriesDto>>>(['series', { genre: [] }])!
    expect(list.pages[0].content[0].booksReadCount).toBe(3)
    expect(list.pages[0].content[1].booksReadCount).toBe(0) // s2 untouched
    expect(toast.success).toHaveBeenCalled()
  })

  it('rolls back detail + list caches and toasts on error', async () => {
    const { qc, wrapper } = setup()
    vi.mocked(komga.markSeriesRead).mockRejectedValueOnce(new Error('boom'))
    qc.setQueryData(['series', 's1'], series({ booksCount: 3, booksUnreadCount: 3 }))
    qc.setQueryData(['series', { genre: [] }], seriesListData([series({ id: 's1', booksCount: 3 })]))

    const { result } = renderHook(() => useMarkSeries(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ seriesId: 's1', read: true }).catch(() => {}) })

    expect(qc.getQueryData<KomgaSeriesDto>(['series', 's1'])).toMatchObject({ booksReadCount: 0, booksUnreadCount: 3 })
    const list = qc.getQueryData<InfiniteData<KomgaPage<KomgaSeriesDto>>>(['series', { genre: [] }])!
    expect(list.pages[0].content[0].booksReadCount).toBe(0)
    expect(toast.error).toHaveBeenCalled()
  })
})

const readList = (over: Partial<KomgaReadListDto> = {}): KomgaReadListDto => ({
  id: 'r1', name: 'To Read', summary: '', ordered: true,
  bookIds: ['b1', 'b2'], filtered: false, createdDate: '', lastModifiedDate: '', ...over,
})

describe('useUpdateReadList', () => {
  it('optimistically sets bookIds on the cached list and PATCHes', async () => {
    const { qc, wrapper } = setup()
    vi.mocked(komga.updateReadList).mockResolvedValue(undefined)
    qc.setQueryData(['readlists', 'r1'], readList())

    const { result } = renderHook(() => useUpdateReadList('r1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ bookIds: ['b2', 'b1'] }) })

    expect(komga.updateReadList).toHaveBeenCalledWith('r1', { bookIds: ['b2', 'b1'] })
    expect(qc.getQueryData<KomgaReadListDto>(['readlists', 'r1'])!.bookIds).toEqual(['b2', 'b1'])
  })

  it('rolls back on error', async () => {
    const { qc, wrapper } = setup()
    vi.mocked(komga.updateReadList).mockRejectedValueOnce(new Error('boom'))
    qc.setQueryData(['readlists', 'r1'], readList())

    const { result } = renderHook(() => useUpdateReadList('r1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ bookIds: ['x'] }).catch(() => {}) })

    expect(qc.getQueryData<KomgaReadListDto>(['readlists', 'r1'])!.bookIds).toEqual(['b1', 'b2'])
    expect(toast.error).toHaveBeenCalled()
  })

  it('optimistically merges name + summary and PATCHes them', async () => {
    const { qc, wrapper } = setup()
    vi.mocked(komga.updateReadList).mockResolvedValue(undefined)
    qc.setQueryData(['readlists', 'r1'], readList())

    const { result } = renderHook(() => useUpdateReadList('r1'), { wrapper })
    await act(async () => { await result.current.mutateAsync({ name: 'Horror', summary: 'spooky' }) })

    expect(komga.updateReadList).toHaveBeenCalledWith('r1', { name: 'Horror', summary: 'spooky' })
    const cached = qc.getQueryData<KomgaReadListDto>(['readlists', 'r1'])!
    expect(cached.name).toBe('Horror')
    expect(cached.summary).toBe('spooky')
  })
})

describe('useDeleteReadList', () => {
  it('calls the client and invalidates the readlists key', async () => {
    const { qc, wrapper } = setup()
    vi.mocked(komga.deleteReadList).mockResolvedValue(undefined)
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteReadList(), { wrapper })
    await act(async () => { await result.current.mutateAsync('r1') })
    expect(komga.deleteReadList).toHaveBeenCalledWith('r1')
    expect(spy).toHaveBeenCalledWith({ queryKey: ['readlists'] })
  })
})

describe('useAddToReadList', () => {
  beforeEach(() => {
    vi.mocked(komga.createReadList).mockResolvedValue(readList({ id: 'rNew' }))
    vi.mocked(komga.updateReadList).mockResolvedValue(undefined)
    vi.mocked(komga.readLists).mockResolvedValue({
      content: [readList({ id: 'r1', name: 'To Read', bookIds: ['b1'] })],
      totalElements: 1, totalPages: 1, number: 0, size: 1, first: true, last: true,
    })
    vi.mocked(komga.seriesBooks).mockResolvedValue({
      content: [book('b1'), book('b2'), book('b3')],
      totalElements: 3, totalPages: 1, number: 0, size: 3, first: true, last: true,
    })
    try { localStorage.clear() } catch { /* jsdom */ }
  })

  it('adds a whole series to the default queue (missing books only)', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useAddToReadList(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ target: { type: 'series', seriesId: 's1' }, listId: 'default' }) })

    expect(komga.seriesBooks).toHaveBeenCalledWith('s1')
    expect(komga.updateReadList).toHaveBeenCalledWith('r1', { bookIds: ['b1', 'b2', 'b3'] })
    expect(toast.success).toHaveBeenCalled()
  })

  it('adds a single book to a named list', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useAddToReadList(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ target: { type: 'book', bookId: 'bX' }, listId: 'r1' }) })
    expect(komga.updateReadList).toHaveBeenCalledWith('r1', { bookIds: ['b1', 'bX'] })
  })

  it('creates a new seeded list when newListName is given', async () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useAddToReadList(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ target: { type: 'book', bookId: 'bX' }, newListName: 'Sci-Fi' }) })
    expect(komga.createReadList).toHaveBeenCalledWith({ name: 'Sci-Fi', summary: '', ordered: true, bookIds: ['bX'] })
  })

  it('creates the default queue when it does not exist yet', async () => {
    vi.mocked(komga.readLists).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 0, first: true, last: true })
    const { wrapper } = setup()
    const { result } = renderHook(() => useAddToReadList(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ target: { type: 'book', bookId: 'bX' }, listId: 'default' }) })
    expect(komga.createReadList).toHaveBeenCalledWith({ name: 'To Read', summary: '', ordered: true, bookIds: ['bX'] })
  })
})
