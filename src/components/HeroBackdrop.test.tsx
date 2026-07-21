import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { HeroBackdrop } from './HeroBackdrop'

/** Controllable Image stub: capture instances, fire load manually. */
class FakeImage {
  static instances: FakeImage[] = []
  onload: (() => void) | null = null
  src = ''
  constructor() { FakeImage.instances.push(this) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeImage.instances = []
})

describe('HeroBackdrop', () => {
  it('renders only the blur base when there is no HD url', () => {
    render(<HeroBackdrop thumbUrl="/thumb.jpg" hdUrl={null} />)
    expect(screen.queryByTestId('backdrop-hd')).not.toBeInTheDocument()
  })

  it('keeps the HD layers invisible until the image loads, then fades them in', () => {
    vi.stubGlobal('Image', FakeImage)
    render(<HeroBackdrop thumbUrl="/thumb.jpg" hdUrl="/hd.jpg" />)
    const hd = screen.getByTestId('backdrop-hd')
    expect(hd.className).toContain('opacity-0')
    expect(FakeImage.instances[0].src).toBe('/hd.jpg')
    act(() => FakeImage.instances[0].onload?.())
    expect(hd.className).toContain('opacity-100')
  })
})
