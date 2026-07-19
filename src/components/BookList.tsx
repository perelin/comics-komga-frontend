import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { KomgaBookDto } from '@/lib/komga/types'
import type { Filters, SortKey } from '@/lib/komga/filters'
import { BookRow, BOOK_GRID_COLS } from './BookRow'

const ROW_H = 52
// Only sort keys that /books/list supports are exposed as clickable headers.
const HEADERS: { label: string; sort?: SortKey; align?: 'right' }[] = [
  { label: '' }, { label: 'Series', sort: 'titleSort' }, { label: '#', sort: 'number', align: 'right' },
  { label: 'Title' }, { label: 'Pages', align: 'right' }, { label: 'Year', sort: 'releaseDate', align: 'right' },
  { label: 'Progress' },
]

/** Flat-Issues list view. Mirrors SeriesList's virtualization and scroll-restore,
 *  with book columns and rows that link to each issue's parent series. */
export function BookList({ items, filters, onFiltersChange, hasNext, fetchNext, initialIndex, onTopIndex }: {
  items: KomgaBookDto[]; filters: Filters; onFiltersChange: (f: Filters) => void; hasNext: boolean; fetchNext: () => void
  initialIndex?: number; onTopIndex: (index: number) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: items.length, getScrollElement: () => parentRef.current, estimateSize: () => ROW_H, overscan: 10 })
  const virtualRows = v.getVirtualItems()

  const [settled, setSettled] = useState(false)
  useLayoutEffect(() => { setSettled(true) }, [])
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || initialIndex == null || !settled || items.length === 0) return
    restored.current = true
    v.scrollToIndex(Math.min(initialIndex, items.length - 1), { align: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, items.length])

  useEffect(() => {
    const last = virtualRows.at(-1)
    if (last && last.index >= items.length - 5 && hasNext) fetchNext()
  }, [virtualRows, items.length, hasNext, fetchNext])

  const clickHeader = (sort?: SortKey) => {
    if (!sort) return
    const dir = filters.sortKey === sort && filters.sortDir === 'asc' ? 'desc' : 'asc'
    onFiltersChange({ ...filters, sortKey: sort, sortDir: dir })
  }

  const handleScroll = () => {
    const st = parentRef.current?.scrollTop ?? 0
    const top = v.getVirtualItems().find((r) => r.end > st)
    if (top) onTopIndex(top.index)
  }

  return (
    <div ref={parentRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto">
      <div className="sticky top-0 z-10 grid items-center gap-3 border-b border-border bg-card px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground"
        style={{ gridTemplateColumns: BOOK_GRID_COLS }}>
        {HEADERS.map((h, i) => (
          <button key={i} type="button" disabled={!h.sort}
            className={`flex items-center gap-1 ${h.align === 'right' ? 'justify-end' : ''} ${h.sort ? 'cursor-pointer hover:text-foreground' : 'cursor-default'}`}
            onClick={() => clickHeader(h.sort)}>
            {h.label}{h.sort && filters.sortKey === h.sort ? (filters.sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
        ))}
      </div>
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((vi) => (
          <div key={items[vi.index].id}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)`, height: vi.size }}>
            <BookRow b={items[vi.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
