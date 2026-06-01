import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePersistentState } from './usePersistentState'

describe('usePersistentState', () => {
  beforeEach(() => localStorage.clear())

  it('returns the default when nothing is stored', () => {
    const { result } = renderHook(() => usePersistentState('view', 'grid'))
    expect(result.current[0]).toBe('grid')
  })
  it('persists and reads back the stored value', () => {
    const { result, unmount } = renderHook(() => usePersistentState('view', 'grid'))
    act(() => result.current[1]('list'))
    expect(result.current[0]).toBe('list')
    unmount()
    const again = renderHook(() => usePersistentState('view', 'grid'))
    expect(again.result.current[0]).toBe('list')
  })
})
