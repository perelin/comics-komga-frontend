import type {
  KomgaSeriesDto, KomgaBookDto, KomgaPage, KomgaLibrary,
} from './types'
import { filtersToCondition, listQueryParams, type Filters } from './filters'

const BASE = '/komga/api/v1'

async function get<T>(path: string, params?: URLSearchParams): Promise<T> {
  const qs = params && [...params.keys()].length ? `?${params.toString()}` : ''
  const res = await fetch(`${BASE}${path}${qs}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Komga ${res.status} ${res.statusText} on ${path}`)
  return (await res.json()) as T
}

/** Fire a write request (PATCH/POST/DELETE). Komga replies 204 No Content, so
 *  nothing is parsed — we only assert success. JSON body + header when given. */
async function send(method: string, path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  })
  if (!res.ok) throw new Error(`Komga ${res.status} ${res.statusText} on ${method} ${path}`)
}

/** POST a JSON body and parse the JSON/page response (the search DSL endpoint). */
async function postList<T>(path: string, body: unknown, params?: URLSearchParams): Promise<T> {
  const qs = params && [...params.keys()].length ? `?${params.toString()}` : ''
  const res = await fetch(`${BASE}${path}${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Komga ${res.status} ${res.statusText} on ${path}`)
  return (await res.json()) as T
}

export const komga = {
  series: (f: Filters, page: number, size: number) =>
    postList<KomgaPage<KomgaSeriesDto>>('/series/list', filtersToCondition(f), listQueryParams(f, page, size)),
  searchSeries: (q: string) =>
    get<KomgaPage<KomgaSeriesDto>>('/series', new URLSearchParams({ search: q, size: '20' })),
  seriesById: (id: string) => get<KomgaSeriesDto>(`/series/${id}`),
  seriesBooks: (id: string) =>
    get<KomgaPage<KomgaBookDto>>(`/series/${id}/books`, new URLSearchParams({ size: '400', sort: 'metadata.numberSort,asc' })),
  seriesByPublisher: (publisher: string) =>
    get<KomgaPage<KomgaSeriesDto>>('/series', new URLSearchParams({ publisher, size: '24', sort: 'metadata.titleSort,asc' })),
  libraries: () => get<KomgaLibrary[]>('/libraries'),
  genres: () => get<string[]>('/genres'),
  publishers: () => get<string[]>('/publishers'),
  ageRatings: () => get<number[]>('/age-ratings'),
  authorNames: (search: string) =>
    get<string[]>('/authors/names', new URLSearchParams({ search })),

  // Write actions (P2L-155). Series-level endpoints mark/clear all books in one
  // request — preferred over iterating per book.
  markBookRead: (id: string) => send('PATCH', `/books/${id}/read-progress`, { completed: true }),
  markBookUnread: (id: string) => send('DELETE', `/books/${id}/read-progress`),
  markSeriesRead: (id: string) => send('POST', `/series/${id}/read-progress`),
  markSeriesUnread: (id: string) => send('DELETE', `/series/${id}/read-progress`),
}
