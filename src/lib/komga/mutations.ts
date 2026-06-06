import {
  useMutation, useQueryClient, type QueryClient, type QueryKey, type InfiniteData,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { komga } from './client'
import {
  setBookRead, setAllBooksRead, recountSeries, setSeriesCounts, setSeriesInPage,
} from './read-progress'
import type { KomgaBookDto, KomgaSeriesDto, KomgaPage, KomgaReadListDto, ReadListUpdate } from './types'

type BooksPage = KomgaPage<KomgaBookDto>
type SeriesList = InfiniteData<KomgaPage<KomgaSeriesDto>>

const seriesKey = (id: string): QueryKey => ['series', id]
const booksKey = (id: string): QueryKey => ['series', id, 'books']

/** A cached value is an infinite series-list iff it carries a `pages` array
 *  (distinguishes it from the detail DTO and the single books page, which also
 *  live under the `['series', …]` prefix). */
function isSeriesList(d: unknown): d is SeriesList {
  return !!d && Array.isArray((d as SeriesList).pages)
}

/** Optimistically set one series' counts in every cached infinite list; return
 *  the prior [key, data] pairs so onError can restore them. */
function patchSeriesLists(qc: QueryClient, seriesId: string, read: boolean): [QueryKey, SeriesList][] {
  const prev: [QueryKey, SeriesList][] = []
  for (const [key, data] of qc.getQueriesData({ queryKey: ['series'] })) {
    if (!isSeriesList(data)) continue
    prev.push([key, data])
    qc.setQueryData<SeriesList>(key, {
      ...data,
      pages: data.pages.map((p) => setSeriesInPage(p, seriesId, read)),
    })
  }
  return prev
}

/** Toggle a single book's read state, with optimistic book + series-count updates. */
export function useMarkBook(seriesId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookId, read }: { bookId: string; read: boolean }) =>
      read ? komga.markBookRead(bookId) : komga.markBookUnread(bookId),
    onMutate: async ({ bookId, read }) => {
      await qc.cancelQueries({ queryKey: seriesKey(seriesId) })
      const prevBooks = qc.getQueryData<BooksPage>(booksKey(seriesId))
      const prevSeries = qc.getQueryData<KomgaSeriesDto>(seriesKey(seriesId))
      if (prevBooks) {
        const nextBooks = setBookRead(prevBooks, bookId, read)
        qc.setQueryData(booksKey(seriesId), nextBooks)
        if (prevSeries) qc.setQueryData(seriesKey(seriesId), recountSeries(prevSeries, nextBooks.content))
      }
      return { prevBooks, prevSeries }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevBooks) qc.setQueryData(booksKey(seriesId), ctx.prevBooks)
      if (ctx?.prevSeries) qc.setQueryData(seriesKey(seriesId), ctx.prevSeries)
      toast.error('Couldn’t update read status')
    },
    onSuccess: (_d, { read }) => toast.success(read ? 'Marked as read' : 'Marked as unread'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['series'] }),
  })
}

/** Mark a whole series read/unread in one request, with optimistic updates to
 *  the detail DTO, its books page, and every cached library-grid list. */
export function useMarkSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ seriesId, read }: { seriesId: string; read: boolean }) =>
      read ? komga.markSeriesRead(seriesId) : komga.markSeriesUnread(seriesId),
    onMutate: async ({ seriesId, read }) => {
      await qc.cancelQueries({ queryKey: ['series'] })
      const prevSeries = qc.getQueryData<KomgaSeriesDto>(seriesKey(seriesId))
      const prevBooks = qc.getQueryData<BooksPage>(booksKey(seriesId))
      if (prevSeries) qc.setQueryData(seriesKey(seriesId), setSeriesCounts(prevSeries, read))
      if (prevBooks) qc.setQueryData(booksKey(seriesId), setAllBooksRead(prevBooks, read))
      const prevLists = patchSeriesLists(qc, seriesId, read)
      return { prevSeries, prevBooks, prevLists }
    },
    onError: (_e, { seriesId }, ctx) => {
      if (ctx?.prevSeries) qc.setQueryData(seriesKey(seriesId), ctx.prevSeries)
      if (ctx?.prevBooks) qc.setQueryData(booksKey(seriesId), ctx.prevBooks)
      ctx?.prevLists.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('Couldn’t update the series')
    },
    onSuccess: (_d, { read }) => toast.success(read ? 'Series marked as read' : 'Series marked as unread'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['series'] }),
  })
}

const readListKey = (id: string): QueryKey => ['readlists', id]

/** Update a read list (membership/order/rename), optimistic on the cached detail. */
export function useUpdateReadList(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReadListUpdate) => komga.updateReadList(id, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: readListKey(id) })
      const prev = qc.getQueryData<KomgaReadListDto>(readListKey(id))
      if (prev) qc.setQueryData<KomgaReadListDto>(readListKey(id), { ...prev, ...body })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(readListKey(id), ctx.prev)
      toast.error('Couldn’t update the list')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['readlists', id] })
      qc.invalidateQueries({ queryKey: ['readlists'], exact: true })
    },
  })
}

export function useDeleteReadList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => komga.deleteReadList(id),
    onError: () => toast.error('Couldn’t delete the list'),
    onSuccess: () => toast.success('List deleted'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['readlists'] }),
  })
}
