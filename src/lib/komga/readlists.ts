import type { KomgaBookDto, KomgaReadListDto } from './types'

/** The default "To Read" queue is identified by this name across devices. */
export const DEFAULT_READLIST_NAME = 'To Read'
const CACHE_KEY = 'komga.readlist.default'

/** Append `incoming` ids not already in `current`, de-duplicated, preserving order. */
export function addIds(current: string[], incoming: string[]): string[] {
  const seen = new Set(current)
  const out = [...current]
  for (const id of incoming) {
    if (!seen.has(id)) { seen.add(id); out.push(id) }
  }
  return out
}

/** Pure array move (drag reorder). */
export function moveId(ids: string[], from: number, to: number): string[] {
  if (from === to) return ids
  const out = [...ids]
  const [moved] = out.splice(from, 1)
  out.splice(to, 0, moved)
  return out
}

/** Drop ids whose matching book is completed. Unknown ids (no book) are kept. */
export function removeReadIds(ids: string[], books: KomgaBookDto[]): string[] {
  const completed = new Set(books.filter((b) => b.readProgress?.completed).map((b) => b.id))
  return ids.filter((id) => !completed.has(id))
}

/** Series → seed ids. Books arrive pre-sorted (numberSort asc) from the client;
 *  all library books are READY in this setup, so no status filter is applied. */
export function bookIdsInOrder(books: KomgaBookDto[]): string[] {
  return books.map((b) => b.id)
}

/** Resolve the default queue: a still-valid cached id wins, else the name match, else null. */
export function resolveDefaultListId(lists: KomgaReadListDto[], cachedId: string | null): string | null {
  if (cachedId && lists.some((l) => l.id === cachedId)) return cachedId
  return lists.find((l) => l.name === DEFAULT_READLIST_NAME)?.id ?? null
}

export function getCachedDefaultId(): string | null {
  try { return localStorage.getItem(CACHE_KEY) } catch { return null }
}
export function setCachedDefaultId(id: string): void {
  try { localStorage.setItem(CACHE_KEY, id) } catch { /* ignore */ }
}
