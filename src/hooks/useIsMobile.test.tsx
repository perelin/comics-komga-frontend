import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'
import { mockViewport } from '@/test/viewport'

afterEach(() => vi.unstubAllGlobals())

describe('useIsMobile', () => {
  it('is false on the desktop default', () => {
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('is true when the viewport matches mobile', () => {
    mockViewport(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
