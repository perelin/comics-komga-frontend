import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LibraryBrowser } from './LibraryBrowser'
import { mockViewport } from '@/test/viewport'

afterEach(() => vi.unstubAllGlobals())

function renderBrowser() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LibraryBrowser />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LibraryBrowser (mobile)', () => {
  it('shows no inline filter aside and opens the filter sheet from the toolbar', async () => {
    mockViewport(true)
    const user = userEvent.setup()
    renderBrowser()
    // mobile shell: no static <aside> (neither the nav sidebar nor an inline filter panel)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    // the facets are not mounted until the sheet is opened
    expect(screen.queryByText('Read status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /filters/i }))
    expect(await screen.findByText('Read status')).toBeInTheDocument()
  })
})
