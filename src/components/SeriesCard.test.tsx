import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SeriesCard } from './SeriesCard'
import { SeriesRow } from './SeriesRow'
import type { SeriesVM } from '@/lib/komga/mapping'

const { markSeriesMutate } = vi.hoisted(() => ({ markSeriesMutate: vi.fn() }))
vi.mock('@/lib/komga/mutations', () => ({
  useMarkSeries: () => ({ mutate: markSeriesMutate, isPending: false }),
}))

const vm: SeriesVM = {
  id: 's1', title: 'Saga', author: 'BKV', publisher: 'Image', status: 'ONGOING',
  genres: ['Science Fiction'], language: 'en', ageRating: 16, oneshot: false,
  progress: { read: 7, inProgress: 1, unread: 3, total: 11 },
  rating: { value: 4.2, needsCheck: false }, goodreads: undefined,
  coverUrl: '/komga/api/v1/series/s1/thumbnail',
}
const doneVm: SeriesVM = { ...vm, progress: { read: 11, inProgress: 0, unread: 0, total: 11 } }

beforeEach(() => vi.clearAllMocks())

function renderCard(s: SeriesVM) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<SeriesCard s={s} />} />
        <Route path="/series/:id" element={<div>SERIES PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SeriesCard / SeriesRow', () => {
  it('card shows title + author', () => {
    renderCard(vm)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.getByText('BKV')).toBeInTheDocument()
  })
  it('row shows title, publisher, and rating value', () => {
    render(<MemoryRouter><SeriesRow s={vm} /></MemoryRouter>)
    expect(screen.getByText('Saga')).toBeInTheDocument()
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
  })

  it('quick-action marks an unfinished series read without navigating', () => {
    renderCard(vm)
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: true })
    expect(screen.queryByText('SERIES PAGE')).not.toBeInTheDocument()
  })

  it('quick-action marks a fully-read series unread', () => {
    renderCard(doneVm)
    fireEvent.click(screen.getByRole('button', { name: 'Mark all unread' }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: false })
    expect(screen.queryByText('SERIES PAGE')).not.toBeInTheDocument()
  })
})
