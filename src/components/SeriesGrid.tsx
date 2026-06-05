import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { SeriesVM } from '@/lib/komga/mapping'
import type { Density } from '@/lib/komga/filters'
import { SeriesCard } from './SeriesCard'

const COL_MIN: Record<Density, number> = { s: 120, m: 150, l: 188 }
const ROW_H: Record<Density, number> = { s: 250, m: 300, l: 366 }
const GAP = 16

function useColumns(ref: React.RefObject<HTMLDivElement | null>, colMin: number): number {
  const [cols, setCols] = useState(6)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth - 32 // account for p-4 horizontal padding
      setCols(Math.max(1, Math.floor((w + GAP) / (colMin + GAP))))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, colMin])
  return cols
}

export function SeriesGrid({ items, density, hasNext, fetchNext, initialOffset, onScroll }: {
  items: SeriesVM[]; density: Density; hasNext: boolean; fetchNext: () => void
  initialOffset: number; onScroll: (el: HTMLElement) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const cols = useColumns(parentRef, COL_MIN[density])
  const rowCount = Math.ceil(items.length / cols)
  const rowVirtualizer = useVirtualizer({
    count: rowCount, getScrollElement: () => parentRef.current, estimateSize: () => ROW_H[density] + GAP, overscan: 4,
    initialOffset,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()

  const restored = useRef(false)
  useLayoutEffect(() => {
    if (restored.current) return
    restored.current = true
    if (parentRef.current && initialOffset) parentRef.current.scrollTop = initialOffset
  }, [initialOffset])

  useEffect(() => {
    const last = virtualRows.at(-1)
    if (last && last.index >= rowCount - 2 && hasNext) fetchNext()
  }, [virtualRows, rowCount, hasNext, fetchNext])

  return (
    <div ref={parentRef} onScroll={(e) => onScroll(e.currentTarget)} className="min-h-0 flex-1 overflow-auto p-4">
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
