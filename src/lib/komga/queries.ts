import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query'
import { komga } from './client'
import { mapSeries, type SeriesVM } from './mapping'
import type { Filters } from './filters'
import type { KomgaPage, KomgaSeriesDto } from './types'

export const PAGE_SIZE = 50

export function nextPageParam(last: KomgaPage<KomgaSeriesDto>): number | undefined {
  return last.last ? undefined : last.number + 1
}

type SeriesData = InfiniteData<KomgaPage<KomgaSeriesDto>> | undefined

export function flattenSeries(data: SeriesData): SeriesVM[] {
  return data?.pages.flatMap((p) => p.content.map(mapSeries)) ?? []
}
export function totalSeries(data: SeriesData): number {
  return data?.pages[0]?.totalElements ?? 0
}

const RELATED_LIMIT = 12
/** View models for the "Related" rail: map a series page, drop the series
 *  we're already viewing, and cap the list. */
export function relatedFromPage(page: KomgaPage<KomgaSeriesDto>, excludeId: string): SeriesVM[] {
  return page.content.map(mapSeries).filter((s) => s.id !== excludeId).slice(0, RELATED_LIMIT)
}

export function useSeriesInfinite(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['series', filters],
    queryFn: ({ pageParam }) => komga.series(filters, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: nextPageParam,
  })
}

export const useLibraries = () => useQuery({ queryKey: ['libraries'], queryFn: komga.libraries })
export const useCollections = () => useQuery({ queryKey: ['collections'], queryFn: komga.collections })
export const useReadLists = () => useQuery({ queryKey: ['readlists'], queryFn: komga.readlists })
export const useGenres = () => useQuery({ queryKey: ['genres'], queryFn: komga.genres })
export const usePublishers = () => useQuery({ queryKey: ['publishers'], queryFn: komga.publishers })
export const useAgeRatings = () => useQuery({ queryKey: ['age-ratings'], queryFn: komga.ageRatings })

export const useSeries = (id: string) => useQuery({ queryKey: ['series', id], queryFn: () => komga.seriesById(id) })
export const useSeriesBooks = (id: string) => useQuery({ queryKey: ['series', id, 'books'], queryFn: () => komga.seriesBooks(id) })
export const useRelatedByPublisher = (publisher: string | undefined, excludeId: string) =>
  useQuery({
    queryKey: ['series', 'related', 'publisher', publisher],
    queryFn: () => komga.seriesByPublisher(publisher!),
    enabled: !!publisher && publisher !== '—',
    select: (page) => relatedFromPage(page, excludeId),
  })
export const useSearchSeries = (q: string) =>
  useQuery({ queryKey: ['search', q], queryFn: () => komga.searchSeries(q), enabled: q.trim().length > 0 })
