import { useCallback } from 'react'

// Module-global cache of a scroll ANCHOR — the index of the first visible item —
// keyed by `${location.key}|${view}`. Survives the unmount of LibraryBrowser on
// a series-detail round-trip within a session; resets on a full page reload.
//
// Why an item index and not a pixel offset: SeriesGrid measures rows
// dynamically (variable-height cards) AND its column count only settles after
// mount, so a saved pixel offset lands on the wrong content (and clamps while
// the list is still short). Anchoring to an item index is column- and
// height-independent: on return we re-derive the row from the live column count
// and let `virtualizer.scrollToIndex` self-correct as rows are measured.
// Design spec: ~/agents/docs/superpowers/specs/2026-06-05-komga-back-nav-scroll-restore-design.md
const cache = new Map<string, number>()

export function useScrollRestore(key: string) {
  const initialIndex = cache.get(key)
  const save = useCallback((index: number) => { cache.set(key, index) }, [key])
  return { initialIndex, save }
}

// Test-only: clear the module cache between tests.
export function __resetScrollCache() { cache.clear() }
