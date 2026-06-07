import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReadListEditDialog } from './ReadListEditDialog'

const mutate = vi.fn()
vi.mock('@/lib/komga/mutations', () => ({ useUpdateReadList: () => ({ mutate }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.getAnimations ??= () => []
})
beforeEach(() => mutate.mockClear())

const list = {
  id: 'r1', name: 'Sci-Fi', summary: 'Old', ordered: true,
  bookIds: ['b1'], filtered: false, createdDate: '', lastModifiedDate: '',
}

describe('ReadListEditDialog', () => {
  it('pre-fills name + summary and saves the trimmed name', () => {
    render(<ReadListEditDialog list={list} onClose={vi.fn()} />)
    const name = screen.getByPlaceholderText('Listenname…') as HTMLInputElement
    expect(name.value).toBe('Sci-Fi')
    expect((screen.getByPlaceholderText('Optional…') as HTMLTextAreaElement).value).toBe('Old')
    fireEvent.change(name, { target: { value: '  Horror  ' } })
    fireEvent.click(screen.getByText('Speichern'))
    expect(mutate).toHaveBeenCalledWith({ name: 'Horror', summary: 'Old' }, expect.anything())
  })

  it('disables Speichern when the name is blank', () => {
    render(<ReadListEditDialog list={list} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Listenname…'), { target: { value: '   ' } })
    expect(screen.getByText('Speichern')).toBeDisabled()
  })
})
