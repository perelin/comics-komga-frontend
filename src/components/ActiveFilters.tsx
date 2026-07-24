import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { resetFiltersKeepingSort, isSeriesOnlyFacet, type Filters, type BrowseDim } from '@/lib/komga/filters'
import { FORMAT_LABEL } from '@/lib/komga/format'

/** `value` is the raw filter entry (used for removal); `display` overrides it in the chip. */
type Chip = { field: keyof Filters; label: string; value: string; display?: string }

function chipsFor(f: Filters, dim: BrowseDim): Chip[] {
  const chips: Chip[] = []
  const push = (field: keyof Filters, label: string, arr: string[]) => arr.forEach((v) => chips.push({ field, label, value: v }))
  push('readStatus', 'Read', f.readStatus)
  push('genre', 'Genre', f.genre)
  push('publisher', 'Publisher', f.publisher)
  push('status', 'Status', f.status)
  push('ageRating', 'Age', f.ageRating)
  push('authors', 'Creator', f.authors)
  f.format.forEach((k) => chips.push({ field: 'format', label: 'Format', value: k, display: FORMAT_LABEL[k] }))
  if (f.formatMixed) chips.push({ field: 'formatMixed', label: 'Format', value: 'mixed', display: 'Mixed' })
  if (f.ratingMin !== undefined || f.ratingMax !== undefined) {
    chips.push({ field: 'ratingMin', label: 'Rating', value: `${(f.ratingMin ?? 1).toFixed(1)}–${(f.ratingMax ?? 5).toFixed(1)} ★` })
  }
  // In Issues mode the series-only facets don't reach /books/list, so don't show
  // chips that imply an active filter that isn't being applied.
  return dim === 'issues' ? chips.filter((c) => !isSeriesOnlyFacet(c.field)) : chips
}

export function ActiveFilters({ filters, onChange, dim = 'series' }: { filters: Filters; onChange: (f: Filters) => void; dim?: BrowseDim }) {
  const chips = chipsFor(filters, dim)
  if (!chips.length) return null
  const remove = (c: Chip) => {
    if (c.field === 'formatMixed') return onChange({ ...filters, formatMixed: undefined })
    if (c.field === 'ratingMin') return onChange({ ...filters, ratingMin: undefined, ratingMax: undefined })
    const arr = (filters[c.field] as string[]).filter((v) => v !== c.value)
    onChange({ ...filters, [c.field]: arr })
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Filters</span>
      {chips.map((c) => (
        <Badge key={`${c.field}:${c.value}`} variant="secondary" className="gap-1">
          <span className="text-muted-foreground">{c.label}:</span>{c.display ?? c.value}
          <button onClick={() => remove(c)} aria-label={`remove ${c.label} ${c.display ?? c.value}`}><X className="size-3" /></button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-6" onClick={() => onChange(resetFiltersKeepingSort(filters))}>
        Clear all
      </Button>
    </div>
  )
}
