import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SeriesCard } from './SeriesCard'
import { SeriesRow } from './SeriesRow'
import type { SeriesVM } from '@/lib/komga/mapping'

const vm: SeriesVM = {
  id: 's1', title: 'Saga', author: 'BKV', publisher: 'Image', status: 'ONGOING',
  genres: ['Science Fiction'], language: 'en', ageRating: 16, oneshot: false,
  progress: { read: 7, inProgress: 1, unread: 3, total: 11 },
  rating: { value: 4.2, needsCheck: false }, goodreads: undefined,
  coverUrl: '/komga/api/v1/series/s1/thumbnail',
}

describe('SeriesCard / SeriesRow', () => {
  it('card shows title + author', () => {
    render(<MemoryRouter><SeriesCard s={vm} /></MemoryRouter>)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.getByText('BKV')).toBeInTheDocument()
  })
  it('row shows title, publisher, and rating value', () => {
    render(<MemoryRouter><SeriesRow s={vm} /></MemoryRouter>)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
  })
})
