import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReadListCreateDialog } from './ReadListCreateDialog'

type AddOpts = { onSuccess?: () => void }
const mutate = vi.fn((_vars: unknown, opts?: AddOpts) => opts?.onSuccess?.())
vi.mock('@/lib/komga/mutations', () => ({
  useAddToReadList: () => ({ mutate, isPending: false }),
}))

const target = { type: 'book', bookId: 'b1' } as const

beforeEach(() => mutate.mockClear())

describe('ReadListCreateDialog', () => {
  it('creates a seeded list from the trimmed name and closes on success', () => {
    const onClose = vi.fn()
    render(<ReadListCreateDialog target={target} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('Listenname…'), { target: { value: '  Horror  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))
    expect(mutate).toHaveBeenCalledWith({ target, newListName: 'Horror' }, expect.objectContaining({ onSuccess: expect.any(Function) }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the submit disabled until a name is entered', () => {
    render(<ReadListCreateDialog target={target} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Anlegen' })).toBeDisabled()
  })
})
