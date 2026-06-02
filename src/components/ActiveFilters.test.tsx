import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActiveFilters } from './ActiveFilters'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

describe('ActiveFilters', () => {
  it('shows a Creator chip and removes it on click', () => {
    const onChange = vi.fn()
    render(<ActiveFilters filters={{ ...DEFAULT_FILTERS, authors: ['Neil Gaiman'] }} onChange={onChange} />)
    expect(screen.getByText('Neil Gaiman')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('remove Creator Neil Gaiman'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ authors: [] }))
  })
})
