import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'

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
})
