import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePersistentState } from '@/hooks/usePersistentState'
import { cn } from '@/lib/utils'
import { resetFiltersKeepingSort, snapRating, type Filters, type BrowseDim } from '@/lib/komga/filters'
import type { FormatKind } from '@/lib/komga/format'
import type { ReadStatus, SeriesStatus } from '@/lib/komga/types'
import { useGenres, usePublishers, useAgeRatings, useReleaseYears, FALLBACK_YEAR_BOUNDS } from '@/lib/komga/queries'
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

/** One numeric bound field. Empty = bound unset; Enter/blur commits, Escape
 *  reverts the draft. While focused the field is uncontrolled so live slider
 *  moves don't fight the caret. `parse` maps the raw entry to the committed
 *  number (returning the current value rejects a malformed entry); an empty
 *  input clears the bound. Unlike the slider gesture, a typed value at the
 *  span edge is an explicit bound — that's how "GENAU <earliest year>" works. */
function BoundsInput({ value, placeholder, label, parse, onCommit }: {
  value?: number
  placeholder: string
  label: string
  parse: (raw: string, current: number | undefined) => number | undefined
  onCommit: (v: number | undefined) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    setDraft(null)
    const raw = draft.trim()
    const next = raw === '' ? undefined : parse(raw, value)
    if (next !== value) onCommit(next)
  }
  return (
    <Input
      value={draft ?? (value === undefined ? '' : String(value))}
      inputMode="decimal"
      placeholder={placeholder}
      aria-label={label}
      className="h-7 min-w-0 flex-1 border-border/60 bg-background/60 text-center text-xs"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        else if (e.key === 'Escape') setDraft(null)
      }}
      onBlur={commit}
    />
  )
}

/** The von/bis entry row under a range slider. Both bounds equal = point range
 *  (GENAU 1986 / GENAU 4 ★); a committed pair with min > max is swapped. */
function BoundPair({ min, max, placeholderMin, placeholderMax, labelMin, labelMax, parse, onCommit }: {
  min?: number
  max?: number
  placeholderMin: string
  placeholderMax: string
  labelMin: string
  labelMax: string
  parse: (raw: string, current: number | undefined, which: 'min' | 'max') => number | undefined
  onCommit: (min: number | undefined, max: number | undefined) => void
}) {
  const commit = (v: number | undefined, which: 'min' | 'max') => {
    let a = which === 'min' ? v : min
    let b = which === 'max' ? v : max
    if (a !== undefined && b !== undefined && a > b) [a, b] = [b, a]
    onCommit(a, b)
  }
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <BoundsInput value={min} placeholder={placeholderMin} label={labelMin}
        parse={(raw, cur) => parse(raw, cur, 'min')} onCommit={(v) => commit(v, 'min')} />
      <span aria-hidden="true" className="text-xs text-muted-foreground">–</span>
      <BoundsInput value={max} placeholder={placeholderMax} label={labelMax}
        parse={(raw, cur) => parse(raw, cur, 'max')} onCommit={(v) => commit(v, 'max')} />
    </div>
  )
}

/** Rating range (1–5 stars): a coarse 0.5-step slider plus exact numeric entry.
 *  Typed bounds are snapped onto the 0.05 tag grid (4.13 → 4.15) — an off-grid
 *  bound would enumerate tags no series carries. Full range = filter inactive
 *  (both bounds undefined); pulling a slider handle to the edge clears that
 *  bound, while a typed edge value is an explicit bound. */
function RatingFacet({ min, max, onChange }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const lo = min ?? 1
  const hi = max ?? 5
  const active = min !== undefined || max !== undefined
  const point = min !== undefined && min === max
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
      <BoundPair
        min={min}
        max={max}
        placeholderMin="1"
        placeholderMax="5"
        labelMin="Rating from"
        labelMax="Rating to"
        parse={(raw, cur) => {
          const n = Number(raw)
          return Number.isFinite(n) ? snapRating(n) : cur
        }}
        onCommit={(ratingMin, ratingMax) => onChange(ratingMin, ratingMax)}
      />
      <div className="mt-1 text-xs text-muted-foreground">
        {point ? `${min} ★ (exakt)` : active ? `${lo} – ${hi} ★` : 'Any rating'}
      </div>
    </div>
  )
}

/** Release-year range over the years actually present in the library: a coarse
 *  slider plus exact numeric entry; both bounds equal = exactly that year.
 *  Full span = filter inactive (both bounds undefined), mirroring the rating
 *  facet's convention. Series dim filters the aggregated series start year,
 *  issues dim the per-book release date. */
function YearFacet({ min, max, lo, hi, onChange }: { min?: number; max?: number; lo: number; hi: number; onChange: (min?: number, max?: number) => void }) {
  const active = min !== undefined || max !== undefined
  const point = min !== undefined && min === max
  return (
    <div className="px-1 pt-1">
      <Slider
        min={lo}
        max={hi}
        step={1}
        value={[min ?? lo, max ?? hi]}
        thumbLabels={['Minimum year', 'Maximum year']}
        onValueChange={(v) => {
          const [a, b] = v as number[]
          onChange(a <= lo ? undefined : a, b >= hi ? undefined : b)
        }}
      />
      <BoundPair
        min={min}
        max={max}
        placeholderMin={String(lo)}
        placeholderMax={String(hi)}
        labelMin="Year from"
        labelMax="Year to"
        parse={(raw, cur) => {
          const n = Number(raw)
          // Non-integers / junk revert; anything outside the data span clamps in.
          return Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : cur
        }}
        onCommit={(yearMin, yearMax) => onChange(yearMin, yearMax)}
      />
      <div className="mt-1 text-xs text-muted-foreground">
        {point ? `${min} (exakt)` : active ? `${min ?? lo} – ${max ?? hi}` : 'Any year'}
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
  // The endpoint reports "None" for unrated series — not a lower bound, and the
  // query layer can't express it (Komga 500s on a null ageRating value).
  const ageRatings = (useAgeRatings().data ?? []).filter((a) => Number.isFinite(Number(a)))
  const yearBounds = useReleaseYears().data ?? FALLBACK_YEAR_BOUNDS
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
    year: filters.yearMin !== undefined || filters.yearMax !== undefined,
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
          {genres.filter((g) => g.toLowerCase().includes(genreQ.toLowerCase())).map((g) => (
            <Opt key={g} label={g} checked={filters.genre.includes(g)} onToggle={() => onChange({ ...filters, genre: toggle(filters.genre, g) })} />
          ))}
        </Facet>
        <Facet title="Publisher" open={isOpen('publisher')} onToggle={() => toggleFacet('publisher')} disabled={seriesOnly} disabledHint={HINT}>
          <Input value={pubQ} onChange={(e) => setPubQ(e.target.value)} placeholder="Search publishers…" className="mb-1 h-7 text-sm" />
          {publishers.filter((p) => p.toLowerCase().includes(pubQ.toLowerCase())).map((p) => (
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
        <Facet title="Release year" open={isOpen('year')} onToggle={() => toggleFacet('year')}>
          <YearFacet
            min={filters.yearMin}
            max={filters.yearMax}
            lo={yearBounds[0]}
            hi={yearBounds[1]}
            onChange={(yearMin, yearMax) => onChange({ ...filters, yearMin, yearMax })}
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
