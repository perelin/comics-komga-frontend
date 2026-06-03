import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('on mobile, hides the sidebar behind a hamburger drawer', async () => {
    mockViewport(true)
    const qc = new QueryClient()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AppShell sidebar={<div>nav-links</div>}>main-content</AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('main-content')).toBeInTheDocument()
    // sidebar content is not mounted until the drawer is opened
    expect(screen.queryByText('nav-links')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(await screen.findByText('nav-links')).toBeInTheDocument()
  })
})
