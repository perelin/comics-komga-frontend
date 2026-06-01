import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toolbar } from './Toolbar'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

describe('Toolbar', () => {
  it('shows the live result count and toggles view', () => {
    const onChange = vi.fn()
    render(
      <Toolbar count={1947} filters={DEFAULT_FILTERS} onFiltersChange={onChange}
        view="grid" onViewChange={() => {}} density="m" onDensityChange={() => {}}
        filterOpen={false} onToggleFilter={() => {}} />,
    )
    expect(screen.getByText('1,947')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /list/i }))
  })
})
