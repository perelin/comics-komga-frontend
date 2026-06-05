import { useCallback } from 'react'

// Module-global cache of scroll offsets, keyed by `${location.key}|${view}`.
// Survives the unmount of LibraryBrowser when navigating to a series detail and
// back within a session; resets on a full page reload. Design spec:
// ~/agents/docs/superpowers/specs/2026-06-05-komga-back-nav-scroll-restore-design.md
const cache = new Map<string, number>()

export function useScrollRestore(key: string) {
  const initialOffset = cache.get(key) ?? 0
  const save = useCallback((el: HTMLElement) => { cache.set(key, el.scrollTop) }, [key])
  return { initialOffset, save }
}

// Test-only: clear the module cache between tests.
export function __resetScrollCache() { cache.clear() }
