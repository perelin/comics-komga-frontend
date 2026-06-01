import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DEFAULT_FILTERS, type Filters } from '@/lib/komga/filters'

type Chip = { field: keyof Filters; label: string; value: string }

function chipsFor(f: Filters): Chip[] {
  const chips: Chip[] = []
  const push = (field: keyof Filters, label: string, arr: string[]) => arr.forEach((v) => chips.push({ field, label, value: v }))
  push('readStatus', 'Read', f.readStatus)
  push('libraryId', 'Library', f.libraryId)
  push('genre', 'Genre', f.genre)
  push('publisher', 'Publisher', f.publisher)
  push('status', 'Status', f.status)
  push('ageRating', 'Age', f.ageRating)
  if (f.oneshot !== undefined) chips.push({ field: 'oneshot', label: 'One-shot', value: String(f.oneshot) })
  return chips
}

export function ActiveFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const chips = chipsFor(filters)
  if (!chips.length) return null
  const remove = (c: Chip) => {
    if (c.field === 'oneshot') return onChange({ ...filters, oneshot: undefined })
    const arr = (filters[c.field] as string[]).filter((v) => v !== c.value)
    onChange({ ...filters, [c.field]: arr })
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Filters</span>
      {chips.map((c, i) => (
        <Badge key={i} variant="secondary" className="gap-1">
          <span className="text-muted-foreground">{c.label}:</span>{c.value}
          <button onClick={() => remove(c)} aria-label={`remove ${c.label} ${c.value}`}><X className="size-3" /></button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-6" onClick={() => onChange({ ...DEFAULT_FILTERS, sortKey: filters.sortKey, sortDir: filters.sortDir })}>
        Clear all
      </Button>
    </div>
  )
}
