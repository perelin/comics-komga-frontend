import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useScrollRestore } from '@/hooks/useScrollRestore'
import { AppShell } from '@/components/AppShell'
import { FacetRail } from '@/components/FacetRail'
import { Toolbar } from '@/components/Toolbar'
import { ActiveFilters } from '@/components/ActiveFilters'
import { SeriesGrid } from '@/components/SeriesGrid'
import { SeriesList } from '@/components/SeriesList'
import { CardGrid } from '@/components/CardGrid'
import { BookCard } from '@/components/BookCard'
import { BookList } from '@/components/BookList'
import { CommandPalette } from '@/components/CommandPalette'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilters } from '@/hooks/useFilters'
import { usePersistentState } from '@/hooks/usePersistentState'
import {
  useSeriesInfinite, flattenSeries, totalSeries,
  useBooksInfinite, flattenBooks, totalBooks,
} from '@/lib/komga/queries'
import type { View, Density, BrowseDim } from '@/lib/komga/filters'
import { coerceSortForDim } from '@/components/sort-options'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileFilterSheet } from '@/components/MobileFilterSheet'

export function LibraryBrowser() {
  const [filters, setFilters] = useFilters()
  const [dim, setDim] = usePersistentState<BrowseDim>('komga:browseDim', 'series')
  const [view, setView] = usePersistentState<View>('view', 'grid')
  const [density, setDensity] = usePersistentState<Density>('density', 'm')
  const isMobile = useIsMobile()
  // Desktop: the facet rail is always visible (in AppShell's aside). Mobile: the
  // same rail content lives in one sheet, toggled by the toolbar's Filters button.
  const [sheetOpen, setSheetOpen] = useState(false)

  const isIssues = dim === 'issues'
  // Only the active dimension fetches (the other is disabled), but both hooks are
  // always called — React requires a stable hook order.
  const seriesQuery = useSeriesInfinite(filters, !isIssues)
  const booksQuery = useBooksInfinite(filters, isIssues)
  const query = isIssues ? booksQuery : seriesQuery
  const seriesItems = flattenSeries(seriesQuery.data)
  const bookItems = flattenBooks(booksQuery.data)
  const itemCount = isIssues ? bookItems.length : seriesItems.length
  const count = isIssues ? totalBooks(booksQuery.data) : totalSeries(seriesQuery.data)

  const effectiveView = isMobile ? 'grid' : view
  const { key: locationKey } = useLocation()
  // Per history-entry + per-view + per-dimension scroll offset, restored when we
  // return from a detail page. See useScrollRestore + the design spec.
  const { initialIndex, save } = useScrollRestore(`${locationKey}|${effectiveView}|${dim}`)

  // Switching dimension coerces a sortKey that's invalid there (e.g. booksCount →
  // Issue #), so the sort dropdown and the request stay in sync. Also runs once on
  // mount to reconcile a persisted dim with a URL-supplied sortKey.
  const switchDim = (d: BrowseDim) => {
    setDim(d)
    setFilters(coerceSortForDim(filters, d))
  }
  useEffect(() => {
    const coerced = coerceSortForDim(filters, dim)
    if (coerced.sortKey !== filters.sortKey) setFilters(coerced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell sidebar={<FacetRail filters={filters} onChange={setFilters} dim={dim} />}>
      <CommandPalette />
      <Toolbar
        count={count}
        filters={filters}
        onFiltersChange={setFilters}
        dim={dim}
        onDimChange={switchDim}
        view={view}
        onViewChange={setView}
        density={density}
        onDensityChange={setDensity}
        filterOpen={sheetOpen}
        onToggleFilter={() => setSheetOpen((o) => !o)}
      />
      <ActiveFilters filters={filters} onChange={setFilters} dim={dim} />
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
        ) : itemCount === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            No {isIssues ? 'issues' : 'series'} match these filters.
          </div>
        ) : isIssues ? (
          effectiveView === 'grid' ? (
            <CardGrid
              items={bookItems}
              getKey={(b) => b.id}
              renderItem={(b) => <BookCard book={b} seriesId={b.seriesId} linkTarget="series" />}
              density={density}
              hasNext={!!query.hasNextPage}
              fetchNext={query.fetchNextPage}
              initialIndex={initialIndex}
              onTopIndex={save}
            />
          ) : (
            <BookList
              items={bookItems}
              filters={filters}
              onFiltersChange={setFilters}
              hasNext={!!query.hasNextPage}
              fetchNext={query.fetchNextPage}
              initialIndex={initialIndex}
              onTopIndex={save}
            />
          )
        ) : effectiveView === 'grid' ? (
          <SeriesGrid
            items={seriesItems}
            density={density}
            hasNext={!!query.hasNextPage}
            fetchNext={query.fetchNextPage}
            initialIndex={initialIndex}
            onTopIndex={save}
          />
        ) : (
          <SeriesList
            items={seriesItems}
            filters={filters}
            onFiltersChange={setFilters}
            hasNext={!!query.hasNextPage}
            fetchNext={query.fetchNextPage}
            initialIndex={initialIndex}
            onTopIndex={save}
          />
        )}
      </div>
      {isMobile && (
        <MobileFilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} onChange={setFilters} dim={dim} />
      )}
    </AppShell>
  )
}
