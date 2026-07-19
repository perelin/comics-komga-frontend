import type { SeriesVM } from '@/lib/komga/mapping'
import type { Density } from '@/lib/komga/filters'
import { CardGrid } from './CardGrid'
import { SeriesCard } from './SeriesCard'

export function SeriesGrid({ items, density, hasNext, fetchNext, initialIndex, onTopIndex }: {
  items: SeriesVM[]; density: Density; hasNext: boolean; fetchNext: () => void
  initialIndex?: number; onTopIndex: (index: number) => void
}) {
  return (
    <CardGrid
      items={items}
      getKey={(s) => s.id}
      renderItem={(s) => <SeriesCard s={s} />}
      density={density}
      hasNext={hasNext}
      fetchNext={fetchNext}
      initialIndex={initialIndex}
      onTopIndex={onTopIndex}
    />
  )
}
