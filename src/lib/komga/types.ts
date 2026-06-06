export type ReadStatus = 'UNREAD' | 'READ' | 'IN_PROGRESS'
export type SeriesStatus = 'ONGOING' | 'ENDED' | 'HIATUS' | 'ABANDONED'

export interface KomgaAuthor { name: string; role: string }
export interface KomgaWebLink { label: string; url: string }

export interface KomgaSeriesMetadata {
  status: SeriesStatus
  title: string
  titleSort: string
  summary: string
  publisher: string
  genres: string[]
  tags: string[]
  links: KomgaWebLink[]
  ageRating: number | null
  language: string
  readingDirection: string
  totalBookCount: number | null
}

export interface KomgaBooksMetadata {
  authors: KomgaAuthor[]
  releaseDate: string | null
  tags: string[]
}

export interface KomgaSeriesDto {
  id: string
  libraryId: string
  name: string
  oneshot: boolean
  booksCount: number
  booksReadCount: number
  booksUnreadCount: number
  booksInProgressCount: number
  metadata: KomgaSeriesMetadata
  booksMetadata: KomgaBooksMetadata
  created: string
  lastModified: string
}

export interface KomgaBookDto {
  id: string
  seriesId: string
  name: string
  media: { pagesCount: number }
  metadata: { title: string; number: string; numberSort: number; releaseDate: string | null; summary: string }
  readProgress: { page: number; completed: boolean; readDate: string } | null
}

export interface KomgaPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface KomgaLibrary { id: string; name: string; unavailable?: boolean }

export interface KomgaReadListDto {
  id: string
  name: string
  summary: string
  ordered: boolean
  bookIds: string[]
  filtered: boolean
  createdDate: string
  lastModifiedDate: string
}
export interface ReadListCreate { name: string; summary: string; ordered: boolean; bookIds: string[] }
export interface ReadListUpdate { name?: string; summary?: string; ordered?: boolean; bookIds?: string[] }
