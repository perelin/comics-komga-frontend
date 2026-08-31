import type { SeriesVM } from '@/lib/komga/mapping'
import type { Density } from '@/lib/komga/filters'
import { CardGrid } from './CardGrid'
import { SeriesCard } from './SeriesCard'

export function SeriesGrid({ items, density, matchedCreators, hasNext, fetchNext, initialIndex, onTopIndex }: {
  items: SeriesVM[]; density: Density; matchedCreators?: string[]; hasNext: boolean; fetchNext: () => void
  initialIndex?: number; onTopIndex: (index: number) => void
}) {
  return (
    <CardGrid
      items={items}
      getKey={(s) => s.id}
      renderItem={(s) => <SeriesCard s={s} matchedCreators={matchedCreators} />}
      density={density}
      hasNext={hasNext}
      fetchNext={fetchNext}
      initialIndex={initialIndex}
      onTopIndex={onTopIndex}
    />
  )
}
