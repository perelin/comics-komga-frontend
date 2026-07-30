import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LayoutGrid, List, SlidersHorizontal, Search, ArrowUp, ArrowDown, Library, FileStack } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Filters, View, Density, SortKey, BrowseDim } from '@/lib/komga/filters'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ScopePicker } from '@/components/ScopePicker'
import { sortOptionsFor, applySortField } from '@/components/sort-options'

export function Toolbar(props: {
  count: number
  filters: Filters
  onFiltersChange: (f: Filters) => void
  dim: BrowseDim; onDimChange: (d: BrowseDim) => void
  view: View; onViewChange: (v: View) => void
  density: Density; onDensityChange: (d: Density) => void
  filterOpen: boolean; onToggleFilter: () => void
}) {
  const { count, filters, onFiltersChange, dim, onDimChange, view, onViewChange, density, onDensityChange, filterOpen, onToggleFilter } = props
  const isMobile = useIsMobile()
  const filtersRef = useRef(filters)
  const onFiltersChangeRef = useRef(onFiltersChange)
  // sync refs after each render so the debounce timer always reads the latest values
  useLayoutEffect(() => { filtersRef.current = filters })
  useLayoutEffect(() => { onFiltersChangeRef.current = onFiltersChange })
  const [term, setTerm] = useState(filters.search ?? '')
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync controlled prop into debounced local state
  useEffect(() => { setTerm(filters.search ?? '') }, [filters.search])
  useEffect(() => {
    const id = setTimeout(() => {
      const current = filtersRef.current
      if ((current.search ?? '') !== term) onFiltersChangeRef.current({ ...current, search: term || undefined })
    }, 300)
    return () => clearTimeout(id)
  }, [term])

  const sortOptions = sortOptionsFor(dim)
  const activeSort = sortOptions.find((o) => o.key === filters.sortKey) ?? sortOptions[0]
  return (
    // Wrapping is unconditional: the controls need ~850px before the search field
    // gets anything, so a nowrap row squeezed the search (its only shrinkable
    // child) down to the bare icon and pushed sort out of the clipped overflow.
    // Every group below is shrink-0, so a shortfall surfaces as an extra row.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <ScopePicker value={filters.library} onChange={(library) => onFiltersChange({ ...filters, library })} />
        <span className="text-sm tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
      </div>
      {/* Browse dimension — series-grouped vs. flat issues. Always visible (incl.
          mobile): more fundamental than the grid/list view toggle. */}
      <div className="flex shrink-0 rounded-md border border-border p-0.5">
        <Button variant={dim === 'series' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => onDimChange('series')}>
          <Library className="size-4" />Series
        </Button>
        <Button variant={dim === 'issues' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => onDimChange('issues')}>
          <FileStack className="size-4" />Issues
        </Button>
      </div>
      <div className="flex-1" />
      <div className="relative order-last w-full shrink-0 md:order-none md:w-72">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Filter these results…" className="h-9 pl-9" />
      </div>
      {!isMobile && (
        <>
          <div className="flex shrink-0 rounded-md border border-border p-0.5">
            <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => onViewChange('grid')}>
              <LayoutGrid className="size-4" />Grid
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => onViewChange('list')}>
              <List className="size-4" />List
            </Button>
          </div>
          {view === 'grid' && (
            <div className="flex shrink-0 rounded-md border border-border p-0.5">
              {(['s', 'm', 'l'] as Density[]).map((d) => (
                <Button key={d} variant={density === d ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0 uppercase" onClick={() => onDensityChange(d)}>{d}</Button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="flex shrink-0 items-center gap-1">
        <Select value={filters.sortKey} onValueChange={(v) => onFiltersChange(applySortField(filters, v as SortKey))}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {activeSort.directional && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label={`Sort direction: ${activeSort.dirLabels[filters.sortDir]}`}
            title={activeSort.dirLabels[filters.sortDir]}
            onClick={() => onFiltersChange({ ...filters, sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          >
            {filters.sortDir === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
          </Button>
        )}
      </div>
      {isMobile && (
        <Button variant={filterOpen ? 'secondary' : 'outline'} size="sm" className="h-9 shrink-0 gap-1.5" onClick={onToggleFilter}>
          <SlidersHorizontal className="size-4" />Filters
        </Button>
      )}
    </div>
  )
}
