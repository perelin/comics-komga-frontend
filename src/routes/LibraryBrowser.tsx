import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Sidebar } from '@/components/Sidebar'
import { Toolbar } from '@/components/Toolbar'
import { ActiveFilters } from '@/components/ActiveFilters'
import { FilterPanel } from '@/components/FilterPanel'
import { SeriesGrid } from '@/components/SeriesGrid'
import { SeriesList } from '@/components/SeriesList'
import { CommandPalette } from '@/components/CommandPalette'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilters } from '@/hooks/useFilters'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useSeriesInfinite, flattenSeries, totalSeries } from '@/lib/komga/queries'
import type { View, Density } from '@/lib/komga/filters'

export function LibraryBrowser() {
  const [filters, setFilters] = useFilters()
  const [view, setView] = usePersistentState<View>('view', 'grid')
  const [density, setDensity] = usePersistentState<Density>('density', 'm')
  const [filterOpen, setFilterOpen] = useState(true)

  const query = useSeriesInfinite(filters)
  const items = flattenSeries(query.data)
  const count = totalSeries(query.data)

  return (
    <AppShell sidebar={<Sidebar filters={filters} onPickSmart={setFilters} />}>
      <CommandPalette />
      <Toolbar
        count={count}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        density={density}
        onDensityChange={setDensity}
        filterOpen={filterOpen}
        onToggleFilter={() => setFilterOpen((o) => !o)}
      />
      <ActiveFilters filters={filters} onChange={setFilters} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {query.isLoading ? (
            <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 overflow-hidden p-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-md" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <p>Couldn&apos;t load the library.</p>
              <button
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                onClick={() => { void query.refetch() }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              No series match these filters.
            </div>
          ) : view === 'grid' ? (
            <SeriesGrid
              items={items}
              density={density}
              hasNext={!!query.hasNextPage}
              fetchNext={() => { void query.fetchNextPage() }}
            />
          ) : (
            <SeriesList
              items={items}
              filters={filters}
              onFiltersChange={setFilters}
              hasNext={!!query.hasNextPage}
              fetchNext={() => { void query.fetchNextPage() }}
            />
          )}
        </div>
        {filterOpen && <FilterPanel filters={filters} onChange={setFilters} />}
      </div>
    </AppShell>
  )
}
