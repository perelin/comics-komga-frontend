import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

// base-ui Dialog waits on element.getAnimations() before settling; jsdom lacks it.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>
  proto.getAnimations ??= () => []
})

describe('ConfirmDialog', () => {
  it('renders title + description and confirms, then closes', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Liste löschen?"
        description="„Sci-Fi“ wird gelöscht."
        confirmLabel="Löschen"
        destructive
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('Liste löschen?')).toBeInTheDocument()
    expect(screen.getByText('„Sci-Fi“ wird gelöscht.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Löschen'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('Abbrechen does not confirm', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="X" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Abbrechen'))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
