import { describe, it, expect, vi } from 'vitest'
import { afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { mockViewport } from '@/test/viewport'

afterEach(() => vi.unstubAllGlobals())

describe('AppShell sign-out', () => {
  it('renders a Sign out link in the desktop rail footer', () => {
    mockViewport(false)
    render(
      <MemoryRouter>
        <AppShell sidebar={<div>facet-rail</div>}><main>content</main></AppShell>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /sign out/i })
    expect(link).toHaveAttribute('href', '/logout')
    // Deliberately a plain anchor: signing out leaves the SPA entirely.
    expect(screen.getByText('facet-rail')).toBeInTheDocument()
  })

  it('renders a sign-out icon button in the mobile top bar', () => {
    mockViewport(true)
    render(
      <MemoryRouter>
        <AppShell><main>content</main></AppShell>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /sign out/i })).toHaveAttribute('href', '/logout')
    expect(screen.getByRole('link', { name: /read lists/i })).toBeInTheDocument()
  })
})
