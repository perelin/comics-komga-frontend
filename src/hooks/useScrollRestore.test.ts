import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollRestore, __resetScrollCache } from './useScrollRestore'

describe('useScrollRestore', () => {
  beforeEach(() => __resetScrollCache())

  it('returns offset 0 for an unknown key', () => {
    const { result } = renderHook(() => useScrollRestore('a|grid'))
    expect(result.current.initialOffset).toBe(0)
  })

  it('saves scrollTop and restores it on a fresh mount with the same key', () => {
    const first = renderHook(() => useScrollRestore('a|grid'))
    act(() => first.result.current.save({ scrollTop: 250 } as HTMLElement))
    first.unmount()
    const second = renderHook(() => useScrollRestore('a|grid'))
    expect(second.result.current.initialOffset).toBe(250)
  })

  it('keeps offsets independent per key', () => {
    const a = renderHook(() => useScrollRestore('a|grid'))
    act(() => a.result.current.save({ scrollTop: 100 } as HTMLElement))
    const b = renderHook(() => useScrollRestore('b|list'))
    expect(b.result.current.initialOffset).toBe(0)
  })
})
