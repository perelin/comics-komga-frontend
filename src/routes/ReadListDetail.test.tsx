import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ReadListDetail } from './ReadListDetail'

const update = vi.fn()
vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: { content: [] } }),
  useReadList: () => ({ isLoading: false, isError: false, data: { id: 'r1', name: 'To Read', bookIds: ['b1', 'b2'] } }),
  useReadListBooks: () => ({ data: { content: [
    { id: 'b1', name: 'One', media: { pagesCount: 1 }, metadata: { title: 'One', number: '1', numberSort: 1, releaseDate: null, summary: '' }, readProgress: { page: 1, completed: true, readDate: '' } },
    { id: 'b2', name: 'Two', media: { pagesCount: 1 }, metadata: { title: 'Two', number: '2', numberSort: 2, releaseDate: null, summary: '' }, readProgress: null },
  ] } }),
}))
vi.mock('@/lib/komga/mutations', () => ({ useUpdateReadList: () => ({ mutate: update }), useDeleteReadList: () => ({ mutate: vi.fn() }) }))
vi.mock('@/components/OpenInPanels', () => ({ OpenInPanels: () => null }))

const renderDetail = () =>
  render(<MemoryRouter initialEntries={['/readlists/r1']}><Routes><Route path="/readlists/:id" element={<ReadListDetail />} /></Routes></MemoryRouter>)

beforeEach(() => update.mockClear())

describe('ReadListDetail', () => {
  it('renders books and removing one PATCHes the trimmed array', () => {
    renderDetail()
    expect(screen.getByText('One')).toBeInTheDocument()
    fireEvent.click(screen.getAllByLabelText('Entfernen')[0])
    expect(update).toHaveBeenCalledWith({ bookIds: ['b2'] })
  })
  it('"Gelesene entfernen" drops completed books', () => {
    renderDetail()
    fireEvent.click(screen.getByText('Gelesene entfernen'))
    expect(update).toHaveBeenCalledWith({ bookIds: ['b2'] })
  })
  it('exposes a list-actions menu trigger in the header', () => {
    renderDetail()
    expect(screen.getByLabelText('Listenaktionen')).toBeInTheDocument()
  })
})
