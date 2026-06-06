import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OpenInPanels } from './OpenInPanels'

// base-ui Popover waits on element.getAnimations() before settling; jsdom has no
// such method. Shim it file-local (per the project's keep-jsdom-shims-local rule).
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.getAnimations ??= () => []
})

describe('OpenInPanels', () => {
  it('shows the OPDS url and copies it', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<OpenInPanels name="To Read" />)
    fireEvent.click(screen.getByText('In Panels öffnen'))
    expect(screen.getByText('https://komga.p2lab.com/opds/v1.2/catalog')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Kopieren'))
    expect(writeText).toHaveBeenCalledWith('https://komga.p2lab.com/opds/v1.2/catalog')
  })
})
