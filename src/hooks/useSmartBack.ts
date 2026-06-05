import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// A "go back" callback that returns the user to the previous in-app location
// (restoring its URL — filters/sort/scope/search — and, paired with
// useScrollRestore, its scroll position). location.key === 'default' marks the
// first history entry of the session: if the detail page itself is that entry
// (a deep link), there is nothing to go back to, so fall back to the root.
export function useSmartBack() {
  const navigate = useNavigate()
  const { key } = useLocation()
  return useCallback(() => {
    if (key !== 'default') navigate(-1)
    else navigate('/')
  }, [navigate, key])
}
