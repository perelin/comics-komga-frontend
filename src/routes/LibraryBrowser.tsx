import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useScrollRestore } from '@/hooks/useScrollRestore'
import { AppShell } from '@/components/AppShell'
import { FacetRail } from '@/components/FacetRail'
import { Toolbar } from '@/components/Toolbar'
import { ActiveFilters } from '@/components/ActiveFilters'
import { SeriesGrid } from '@/components/SeriesGrid'
import { SeriesList } from '@/components/SeriesList'
import { CommandPalette } from '@/components/CommandPalette'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilters } from '@/hooks/useFilters'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useSeriesInfinite, flattenSeries, totalSeries } from '@/lib/komga/queries'
import type { View, Density } from '@/lib/komga/filters'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileFilterSheet } from '@/components/MobileFilterSheet'

export function LibraryBrowser() {
  const [filters, setFilters] = useFilters()
  const [view, setView] = usePersistentState<View>('view', 'grid')
  const [density, setDensity] = usePersistentState<Density>('density', 'm')
  const isMobile = useIsMobile()
  // Desktop: the facet rail is always visible (in AppShell's aside). Mobile: the
  // same rail content lives in one sheet, toggled by the toolbar's Filters button.
  const [sheetOpen, setSheetOpen] = useState(false)

  const query = useSeriesInfinite(filters)
  const items = flattenSeries(query.data)
  const count = totalSeries(query.data)
  const effectiveView = isMobile ? 'grid' : view
  const { key: locationKey } = useLocation()
  // Per history-entry + per-view scroll offset, restored when we return from a
  // series detail page. See useScrollRestore + the design spec.
  const { initialOffset, save } = useScrollRestore(`${locationKey}|${effectiveView}`)

  return (
    <AppShell sidebar={<FacetRail filters={filters} onChange={setFilters} />}>
      <CommandPalette />
      <Toolbar
        count={count}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        density={density}
        onDensityChange={setDensity}
        filterOpen={sheetOpen}
        onToggleFilter={() => setSheetOpen((o) => !o)}
      />
      <ActiveFilters filters={filters} onChange={setFilters} />
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
        ) : effectiveView === 'grid' ? (
          <SeriesGrid
            items={items}
            density={density}
            hasNext={!!query.hasNextPage}
            fetchNext={query.fetchNextPage}
            initialOffset={initialOffset}
            onScroll={save}
          />
        ) : (
          <SeriesList
            items={items}
            filters={filters}
            onFiltersChange={setFilters}
            hasNext={!!query.hasNextPage}
            fetchNext={query.fetchNextPage}
            initialOffset={initialOffset}
            onScroll={save}
          />
        )}
      </div>
      {isMobile && (
        <MobileFilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} onChange={setFilters} />
      )}
    </AppShell>
  )
}
