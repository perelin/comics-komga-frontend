import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { mockViewport } from './test/viewport'

afterEach(() => vi.unstubAllGlobals())

describe('AppShell', () => {
  it('renders the sidebar brand and a main region', () => {
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><AppShell><div>hello-main</div></AppShell></MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Komga')).toBeInTheDocument()
    expect(screen.getByText('hello-main')).toBeInTheDocument()
  })

  it('on mobile, renders a slim brand bar; sidebar is not mounted (lives in the filter sheet)', () => {
    mockViewport(true)
    const qc = new QueryClient()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AppShell sidebar={<div>nav-links</div>}>main-content</AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('main-content')).toBeInTheDocument()
    // Mobile shell: no hamburger button and no aside — sidebar lives in the filter sheet
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    // sidebar content is not mounted (it's only shown via the filter sheet in the route)
    expect(screen.queryByText('nav-links')).not.toBeInTheDocument()
  })
})
