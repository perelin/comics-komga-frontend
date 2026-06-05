import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const navigate = vi.fn()
const location = { key: 'abc' as string }
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => location,
}))

import { useSmartBack } from './useSmartBack'

describe('useSmartBack', () => {
  beforeEach(() => navigate.mockClear())

  it('navigates back one entry when there is in-app history', () => {
    location.key = 'abc'
    const { result } = renderHook(() => useSmartBack())
    result.current()
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('falls back to the root when the page is the first session entry (deep link)', () => {
    location.key = 'default'
    const { result } = renderHook(() => useSmartBack())
    result.current()
    expect(navigate).toHaveBeenCalledWith('/')
  })
})
