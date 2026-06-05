import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollRestore, __resetScrollCache } from './useScrollRestore'

describe('useScrollRestore', () => {
  beforeEach(() => __resetScrollCache())

  it('returns undefined for an unknown key', () => {
    const { result } = renderHook(() => useScrollRestore('a|grid'))
    expect(result.current.initialIndex).toBeUndefined()
  })

  it('saves an anchor index and restores it on a fresh mount with the same key', () => {
    const first = renderHook(() => useScrollRestore('a|grid'))
    act(() => first.result.current.save(205))
    first.unmount()
    const second = renderHook(() => useScrollRestore('a|grid'))
    expect(second.result.current.initialIndex).toBe(205)
  })

  it('keeps anchors independent per key', () => {
    const a = renderHook(() => useScrollRestore('a|grid'))
    act(() => a.result.current.save(100))
    const b = renderHook(() => useScrollRestore('b|list'))
    expect(b.result.current.initialIndex).toBeUndefined()
  })
})
