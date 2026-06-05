import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SmartFolders } from './SmartFolders'
import { FilterPanelInner } from './FilterPanel'
import type { Filters } from '@/lib/komga/filters'

/** The single mobile filter surface: scope-aware smart folders + the facet list
 *  in one right-side sheet (replaces the old hamburger drawer + separate sheet). */
export function MobileFilterSheet({
  open, onOpenChange, filters, onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: Filters
  onChange: (f: Filters) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetTitle className="sr-only">Filters</SheetTitle>
        <SmartFolders filters={filters} onChange={onChange} />
        <FilterPanelInner filters={filters} onChange={onChange} />
      </SheetContent>
    </Sheet>
  )
}
