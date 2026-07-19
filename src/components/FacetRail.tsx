import { SmartFolders } from './SmartFolders'
import { FilterPanelInner } from './FilterPanel'
import type { Filters, BrowseDim } from '@/lib/komga/filters'

/** The single left rail: scope-aware smart folders on top, the facet list below.
 *  Replaces the old nav Sidebar (libraries-nav + collections + read-lists gone). */
export function FacetRail({ filters, onChange, dim = 'series' }: { filters: Filters; onChange: (f: Filters) => void; dim?: BrowseDim }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SmartFolders filters={filters} onChange={onChange} />
      <FilterPanelInner filters={filters} onChange={onChange} dim={dim} />
    </div>
  )
}
