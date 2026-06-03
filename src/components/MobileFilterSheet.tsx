import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { FilterPanelInner } from './FilterPanel'
import type { Filters } from '@/lib/komga/filters'

/** The filter facets in a right-side Sheet for mobile. Reuses FilterPanelInner
 *  (the same body as the desktop inline panel). */
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
        <FilterPanelInner filters={filters} onChange={onChange} />
      </SheetContent>
    </Sheet>
  )
}
