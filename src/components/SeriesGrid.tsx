import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { SeriesVM } from '@/lib/komga/mapping'
import type { Density } from '@/lib/komga/filters'
import { SeriesCard } from './SeriesCard'

const COL_MIN: Record<Density, number> = { s: 120, m: 150, l: 188 }
const ROW_H: Record<Density, number> = { s: 250, m: 300, l: 366 }
const GAP = 16

// Returns [columns, measured]. `measured` flips true only once the real width
// has been read — scroll restore must wait for it, otherwise it derives the row
// from the default column count (the rendered value can't update mid-commit).
function useColumns(ref: React.RefObject<HTMLDivElement | null>, colMin: number): [number, boolean] {
  const [cols, setCols] = useState(6)
  const [measured, setMeasured] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth - 32 // account for p-4 horizontal padding
      setCols(Math.max(1, Math.floor((w + GAP) / (colMin + GAP))))
      setMeasured(true)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, colMin])
  return [cols, measured]
}

export function SeriesGrid({ items, density, hasNext, fetchNext, initialIndex, onTopIndex }: {
  items: SeriesVM[]; density: Density; hasNext: boolean; fetchNext: () => void
  initialIndex?: number; onTopIndex: (index: number) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [cols, measured] = useColumns(parentRef, COL_MIN[density])
  const rowCount = Math.ceil(items.length / cols)
  const rowVirtualizer = useVirtualizer({
    count: rowCount, getScrollElement: () => parentRef.current, estimateSize: () => ROW_H[density] + GAP, overscan: 4,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()

  // Restore once, after the column count is measured and data is present: scroll
  // the saved item's row to the top. We anchor to the item INDEX, re-derive its
  // row from the measured column count, and let scrollToIndex self-correct for
  // dynamically measured row heights.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || initialIndex == null || !measured || rowCount === 0) return
    restored.current = true
    const rowIndex = Math.min(Math.floor(initialIndex / cols), rowCount - 1)
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measured, cols, rowCount])

  useEffect(() => {
    const last = virtualRows.at(-1)
    if (last && last.index >= rowCount - 2 && hasNext) fetchNext()
  }, [virtualRows, rowCount, hasNext, fetchNext])

  // Track the first visible item index so we can restore it on return.
  const handleScroll = () => {
    const st = parentRef.current?.scrollTop ?? 0
    const top = rowVirtualizer.getVirtualItems().find((v) => v.end > st)
    if (top) onTopIndex(top.index * cols)
  }

  return (
    <div ref={parentRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto p-4">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {virtualRows.map((vrow) => {
          const start = vrow.index * cols
          const rowItems = items.slice(start, start + cols)
          return (
            <div key={vrow.key} data-index={vrow.index} ref={rowVirtualizer.measureElement}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vrow.start}px)`, paddingBottom: GAP }}>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: GAP }}>
                {rowItems.map((s) => <SeriesCard key={s.id} s={s} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
