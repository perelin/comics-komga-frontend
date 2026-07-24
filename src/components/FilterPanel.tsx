import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePersistentState } from '@/hooks/usePersistentState'
import { cn } from '@/lib/utils'
import { resetFiltersKeepingSort, type Filters, type BrowseDim } from '@/lib/komga/filters'
import type { FormatKind } from '@/lib/komga/format'
import type { ReadStatus, SeriesStatus } from '@/lib/komga/types'
import { useGenres, usePublishers, useAgeRatings } from '@/lib/komga/queries'
import { AuthorFacet } from './AuthorFacet'

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function Facet({
  title,
  open,
  onToggle,
  children,
  disabled = false,
  disabledHint,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  /** Greyed + non-collapsible; shows disabledHint instead of its options. Used
   *  for series-only facets in the Issues dimension (books/list can't filter them). */
  disabled?: boolean
  disabledHint?: string
}) {
  if (disabled) {
    return (
      <div className="border-b border-border">
        <div aria-disabled="true" className="flex w-full items-center gap-1.5 py-3 text-sm font-medium text-muted-foreground/50">
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
          <span>{title}</span>
        </div>
        {disabledHint && <div className="pb-3 pl-6 text-xs text-muted-foreground/60">{disabledHint}</div>}
      </div>
    )
  }
  return (
    <div className="border-b border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 py-3 text-sm font-medium outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        <span>{title}</span>
      </button>
      {open && <div className="flex flex-col gap-0.5 pb-3">{children}</div>}
    </div>
  )
}

function Opt({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div role="button" tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-muted-foreground outline-none hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      <Checkbox checked={checked} aria-label={label} tabIndex={-1} className="pointer-events-none" />
      <span aria-hidden="true" className="truncate">{label}</span>
    </div>
  )
}

/** Rating range slider (1–5 stars, half-star steps). Full range = filter inactive
 *  (both bounds undefined), so pulling the handles back to the edges clears it. */
function RatingFacet({ min, max, onChange }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const lo = min ?? 1
  const hi = max ?? 5
  const active = min !== undefined || max !== undefined
  return (
    <div className="px-1 pt-1">
      <Slider
        min={1}
        max={5}
        step={0.5}
        value={[lo, hi]}
        thumbLabels={['Minimum rating', 'Maximum rating']}
        onValueChange={(v) => {
          const [a, b] = v as number[]
          onChange(a <= 1 ? undefined : a, b >= 5 ? undefined : b)
        }}
      />
      <div className="mt-1 text-xs text-muted-foreground">
        {active ? `${lo.toFixed(1)} – ${hi.toFixed(1)} ★` : 'Any rating'}
      </div>
    </div>
  )
}

const READ_STATUS: [ReadStatus, string][] = [['UNREAD', 'Unread'], ['IN_PROGRESS', 'In progress'], ['READ', 'Read']]
const STATUS: [SeriesStatus, string][] = [['ONGOING', 'Ongoing'], ['ENDED', 'Ended'], ['HIATUS', 'Hiatus'], ['ABANDONED', 'Abandoned']]
const FORMATS: [FormatKind, string][] = [
  ['singles', 'Singles'], ['tpb', 'Trades (TPB)'], ['omnibus', 'Omnibus'],
  ['oneshot', 'One-shots'], ['ogn', 'Graphic novels (OGN)'],
]

export function FilterPanelInner({ filters, onChange, dim = 'series' }: { filters: Filters; onChange: (f: Filters) => void; dim?: BrowseDim }) {
  // /books/list can't filter on these series-level facets → grey them out in Issues mode.
  const seriesOnly = dim === 'issues'
  const HINT = 'Only in Series view'
  const genres = useGenres().data ?? []
  const publishers = usePublishers().data ?? []
  const ageRatings = useAgeRatings().data ?? []
  const [genreQ, setGenreQ] = useState('')
  const [pubQ, setPubQ] = useState('')
  const [openMap, setOpenMap] = usePersistentState<Record<string, boolean>>('komga.facets.open', {})

  const active: Record<string, boolean> = {
    readStatus: filters.readStatus.length > 0,
    creators: filters.authors.length > 0,
    status: filters.status.length > 0,
    genre: filters.genre.length > 0,
    publisher: filters.publisher.length > 0,
    ageRating: filters.ageRating.length > 0,
    rating: filters.ratingMin !== undefined || filters.ratingMax !== undefined,
    format: filters.format.length > 0 || filters.formatMixed === true,
  }
  const isOpen = (key: string): boolean => openMap[key] ?? active[key] ?? false
  const toggleFacet = (key: string) => setOpenMap({ ...openMap, [key]: !isOpen(key) })

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-semibold">Filters</span>
        <Button variant="ghost" size="sm" className="h-7" onClick={() => onChange(resetFiltersKeepingSort(filters))}>Reset</Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4">
        <Facet title="Read status" open={isOpen('readStatus')} onToggle={() => toggleFacet('readStatus')}>
          {READ_STATUS.map(([k, l]) => <Opt key={k} label={l} checked={filters.readStatus.includes(k)} onToggle={() => onChange({ ...filters, readStatus: toggle(filters.readStatus, k) })} />)}
        </Facet>
        <Facet title="Creators" open={isOpen('creators')} onToggle={() => toggleFacet('creators')}>
          <AuthorFacet authors={filters.authors} onChange={(authors) => onChange({ ...filters, authors })} />
        </Facet>
        <Facet title="Status" open={isOpen('status')} onToggle={() => toggleFacet('status')} disabled={seriesOnly} disabledHint={HINT}>
          {STATUS.map(([k, l]) => <Opt key={k} label={l} checked={filters.status.includes(k)} onToggle={() => onChange({ ...filters, status: toggle(filters.status, k) })} />)}
        </Facet>
        <Facet title="Genre" open={isOpen('genre')} onToggle={() => toggleFacet('genre')} disabled={seriesOnly} disabledHint={HINT}>
          <Input value={genreQ} onChange={(e) => setGenreQ(e.target.value)} placeholder="Search genres…" className="mb-1 h-7 text-sm" />
          {genres.filter((g) => g.toLowerCase().includes(genreQ.toLowerCase())).slice(0, 100).map((g) => (
            <Opt key={g} label={g} checked={filters.genre.includes(g)} onToggle={() => onChange({ ...filters, genre: toggle(filters.genre, g) })} />
          ))}
        </Facet>
        <Facet title="Publisher" open={isOpen('publisher')} onToggle={() => toggleFacet('publisher')} disabled={seriesOnly} disabledHint={HINT}>
          <Input value={pubQ} onChange={(e) => setPubQ(e.target.value)} placeholder="Search publishers…" className="mb-1 h-7 text-sm" />
          {publishers.filter((p) => p.toLowerCase().includes(pubQ.toLowerCase())).slice(0, 100).map((p) => (
            <Opt key={p} label={p} checked={filters.publisher.includes(p)} onToggle={() => onChange({ ...filters, publisher: toggle(filters.publisher, p) })} />
          ))}
        </Facet>
        <Facet title="Age rating" open={isOpen('ageRating')} onToggle={() => toggleFacet('ageRating')} disabled={seriesOnly} disabledHint={HINT}>
          {ageRatings.map((a) => <Opt key={a} label={`${a}+`} checked={filters.ageRating.includes(String(a))} onToggle={() => onChange({ ...filters, ageRating: toggle(filters.ageRating, String(a)) })} />)}
        </Facet>
        <Facet title="Rating" open={isOpen('rating')} onToggle={() => toggleFacet('rating')}>
          <RatingFacet
            min={filters.ratingMin}
            max={filters.ratingMax}
            onChange={(ratingMin, ratingMax) => onChange({ ...filters, ratingMin, ratingMax })}
          />
        </Facet>
        <Facet title="Format" open={isOpen('format')} onToggle={() => toggleFacet('format')}>
          {FORMATS.map(([k, l]) => <Opt key={k} label={l} checked={filters.format.includes(k)} onToggle={() => onChange({ ...filters, format: toggle(filters.format, k) })} />)}
          <div className="mt-1 border-t border-border pt-1">
            <Opt label="Mixed formats (cleanup)" checked={filters.formatMixed === true} onToggle={() => onChange({ ...filters, formatMixed: filters.formatMixed === true ? undefined : true })} />
          </div>
        </Facet>
      </ScrollArea>
    </>
  )
}
