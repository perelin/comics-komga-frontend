import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SmartFolders } from './SmartFolders'
import { DEFAULT_FILTERS, type Filters } from '@/lib/komga/filters'
import { SMART_PRESETS, applySmartFolder } from '@/lib/library'

describe('SmartFolders', () => {
  it('applies a folder, preserving scope and clearing other facets', () => {
    const onChange = vi.fn()
    const filters: Filters = { ...DEFAULT_FILTERS, library: 'lib9', genre: ['Horror'] }
    render(<SmartFolders filters={filters} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /continue reading/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ library: 'lib9', readStatus: ['IN_PROGRESS'], genre: [] }))
  })

  it('marks the matching folder active via aria-pressed', () => {
    const filters = applySmartFolder(SMART_PRESETS.unread.filters, { ...DEFAULT_FILTERS, library: 'lib9' })
    render(<SmartFolders filters={filters} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /unread/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /continue reading/i })).toHaveAttribute('aria-pressed', 'false')
  })
})
