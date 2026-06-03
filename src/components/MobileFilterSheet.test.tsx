import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileFilterSheet } from './MobileFilterSheet'
import { DEFAULT_FILTERS } from '@/lib/komga/filters'

function renderSheet(open: boolean) {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MobileFilterSheet open={open} onOpenChange={() => {}} filters={DEFAULT_FILTERS} onChange={() => {}} />
    </QueryClientProvider>,
  )
}

describe('MobileFilterSheet', () => {
  it('renders the facet panel when open', async () => {
    renderSheet(true)
    expect(await screen.findByText('Read status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    renderSheet(false)
    expect(screen.queryByText('Read status')).not.toBeInTheDocument()
  })
})
