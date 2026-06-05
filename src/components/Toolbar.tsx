import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LayoutGrid, List, SlidersHorizontal, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Filters, View, Density, SortKey, SortDir } from '@/lib/komga/filters'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ScopePicker } from '@/components/ScopePicker'

type SortOption = { value: string; label: string; sortKey: SortKey; sortDir: SortDir }
const SORTS: SortOption[] = [
  { value: 'titleSort:asc', label: 'Title (A–Z)', sortKey: 'titleSort', sortDir: 'asc' },
  { value: 'createdDate:desc', label: 'Recently added', sortKey: 'createdDate', sortDir: 'desc' },
  { value: 'lastModified:desc', label: 'Recently updated', sortKey: 'lastModified', sortDir: 'desc' },
]

export function Toolbar(props: {
  count: number
  filters: Filters
  onFiltersChange: (f: Filters) => void
  view: View; onViewChange: (v: View) => void
  density: Density; onDensityChange: (d: Density) => void
  filterOpen: boolean; onToggleFilter: () => void
}) {
  const { count, filters, onFiltersChange, view, onViewChange, density, onDensityChange, filterOpen, onToggleFilter } = props
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

  const sortValue = `${filters.sortKey}:${filters.sortDir}`
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5 md:flex-nowrap">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <ScopePicker value={filters.library} onChange={(library) => onFiltersChange({ ...filters, library })} />
        <span className="text-sm tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
      </div>
      <div className="flex-1" />
      <div className="relative order-last w-full md:order-none md:w-72">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Filter these results…" className="h-9 pl-9" />
      </div>
      {!isMobile && (
        <>
          <div className="flex rounded-md border border-border p-0.5">
            <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => onViewChange('grid')}>
              <LayoutGrid className="size-4" />Grid
            </Button>
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1" onClick={() => onViewChange('list')}>
              <List className="size-4" />List
            </Button>
          </div>
          {view === 'grid' && (
            <div className="flex rounded-md border border-border p-0.5">
              {(['s', 'm', 'l'] as Density[]).map((d) => (
                <Button key={d} variant={density === d ? 'secondary' : 'ghost'} size="sm" className="h-7 w-7 p-0 uppercase" onClick={() => onDensityChange(d)}>{d}</Button>
              ))}
            </div>
          )}
        </>
      )}
      <Select value={sortValue} onValueChange={(v) => {
        const s = SORTS.find((o) => `${o.sortKey}:${o.sortDir}` === v)!
        onFiltersChange({ ...filters, sortKey: s.sortKey, sortDir: s.sortDir })
      }}>
        <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SORTS.map((o) => <SelectItem key={o.value} value={`${o.sortKey}:${o.sortDir}`}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {isMobile && (
        <Button variant={filterOpen ? 'secondary' : 'outline'} size="sm" className="h-9 gap-1.5" onClick={onToggleFilter}>
          <SlidersHorizontal className="size-4" />Filters
        </Button>
      )}
    </div>
  )
}
