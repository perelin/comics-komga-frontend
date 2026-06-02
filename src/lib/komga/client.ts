import type {
  KomgaSeriesDto, KomgaBookDto, KomgaPage, KomgaLibrary,
  KomgaCollectionDto, KomgaReadListDto,
} from './types'
import { filtersToKomgaParams, type Filters } from './filters'

const BASE = '/komga/api/v1'

async function get<T>(path: string, params?: URLSearchParams): Promise<T> {
  const qs = params && [...params.keys()].length ? `?${params.toString()}` : ''
  const res = await fetch(`${BASE}${path}${qs}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Komga ${res.status} ${res.statusText} on ${path}`)
  return (await res.json()) as T
}

export const komga = {
  series: (f: Filters, page: number, size: number) =>
    get<KomgaPage<KomgaSeriesDto>>('/series', filtersToKomgaParams(f, page, size)),
  searchSeries: (q: string) =>
    get<KomgaPage<KomgaSeriesDto>>('/series', new URLSearchParams({ search: q, size: '20' })),
  seriesById: (id: string) => get<KomgaSeriesDto>(`/series/${id}`),
  seriesBooks: (id: string) =>
    get<KomgaPage<KomgaBookDto>>(`/series/${id}/books`, new URLSearchParams({ size: '400', sort: 'metadata.numberSort,asc' })),
  seriesByPublisher: (publisher: string) =>
    get<KomgaPage<KomgaSeriesDto>>('/series', new URLSearchParams({ publisher, size: '24', sort: 'metadata.titleSort,asc' })),
  libraries: () => get<KomgaLibrary[]>('/libraries'),
  collections: () => get<KomgaPage<KomgaCollectionDto>>('/collections', new URLSearchParams({ size: '500' })),
  readlists: () => get<KomgaPage<KomgaReadListDto>>('/readlists', new URLSearchParams({ size: '500' })),
  genres: () => get<string[]>('/genres'),
  publishers: () => get<string[]>('/publishers'),
  ageRatings: () => get<number[]>('/age-ratings'),
}
