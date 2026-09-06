import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

/** Status line for a bound pair, in the same notation as the filter chips:
 *  `≥ 2019` / `≤ 2023` / `1986 – 2020` / `= 1986` (point) / the any-label. */
function rangeStatusLabel(min: number | undefined, max: number | undefined, unit: string, anyLabel: string): string {
  if (min === undefined && max === undefined) return anyLabel
  if (min !== undefined && min === max) return `= ${min}${unit}`
  if (min !== undefined && max !== undefined) return `${min} – ${max}${unit}`
  if (min !== undefined) return `≥ ${min}${unit}`
  return `≤ ${max}${unit}`
}

/** A small preset chip (`80s`, `≥ 4 ★`) — the quick-pick row that replaces the
 *  slider's coarse gesture. Clicking the active preset clears it again. */
function PresetChip({ label, active, ariaLabel, onClick }: { label: string; active: boolean; ariaLabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'rounded border px-1.5 py-0.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

/** The von/bis entry row — the ONLY input for a range facet, following the
 *  date-range-picker convention: committing the first value SEEDS both ends
 *  (a point — `= 1986` after one entry, no double typing); the second field
 *  then widens it, and clearing it reopens that side (`≥ 1986`). Fields are
 *  select-all-on-focus; Enter/blur commits, Escape reverts the draft; a
 *  committed pair with min > max is swapped. */
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
  const [draftMin, setDraftMin] = useState<string | null>(null)
  const [draftMax, setDraftMax] = useState<string | null>(null)
  const maxRef = useRef<HTMLInputElement>(null)
  // Set by the keyboard-advance path; the post-render effect performs the
  // focus+select once the seeded value has actually rendered into the field.
  const advanceRef = useRef(false)
  useEffect(() => {
    if (!advanceRef.current) return
    advanceRef.current = false
    maxRef.current?.focus()
    maxRef.current?.select()
  })

  const emit = (a: number | undefined, b: number | undefined) => {
    if (a !== undefined && b !== undefined && a > b) [a, b] = [b, a]
    onCommit(a, b)
  }

  // --- lower bound ---
  const commitMin = (advance: boolean) => {
    if (draftMin === null) {
      if (advance) maxRef.current?.focus()
      return
    }
    setDraftMin(null)
    const raw = draftMin.trim()
    const next = raw === '' ? undefined : parse(raw, min, 'min')
    if (next !== min) {
      if (next === undefined) emit(undefined, max)
      else if (max === undefined) emit(next, next) // point seed: one entry = exactly this value
      else emit(next, max)
    }
    if (advance) advanceRef.current = true
  }
  // --- upper bound ---
  const commitMax = () => {
    if (draftMax === null) return
    setDraftMax(null)
    const raw = draftMax.trim()
    const next = raw === '' ? undefined : parse(raw, max, 'max')
    if (next !== max) emit(min, next)
  }

  const fieldProps = {
    inputMode: 'decimal' as const,
    className: 'h-7 min-w-0 flex-1 border-border/60 bg-background/60 text-center text-xs',
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
  }

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <Input
        {...fieldProps}
        value={draftMin ?? (min === undefined ? '' : String(min))}
        placeholder={placeholderMin}
        aria-label={labelMin}
        onChange={(e) => setDraftMin(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            commitMin(true)
          } else if (e.key === 'Escape') setDraftMin(null)
        }}
        onBlur={() => commitMin(false)}
      />
      <span aria-hidden="true" className="text-xs text-muted-foreground">–</span>
      <Input
        {...fieldProps}
        ref={maxRef}
        value={draftMax ?? (max === undefined ? '' : String(max))}
        placeholder={placeholderMax}
        aria-label={labelMax}
        onChange={(e) => setDraftMax(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commitMax() }
          else if (e.key === 'Escape') setDraftMax(null)
        }}
        onBlur={commitMax}
      />
    </div>
  )
}

/** Rating facet (1–5 stars): presets for the common thresholds plus exact
 *  numeric entry. Typed bounds are snapped onto the 0.05 tag grid (4.13 →
 *  4.15) — an off-grid bound would enumerate tags no series carries. One
 *  entry + Enter = exactly that rating (point seed); an empty side = open. */
function RatingFacet({ min, max, onChange }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const presets: [number, string][] = [[4, '≥ 4 ★'], [4.5, '≥ 4.5 ★']]
  return (
    <div className="px-1 pt-1">
      <div className="flex flex-wrap gap-1">
        {presets.map(([v, label]) => (
          <PresetChip
            key={label}
            label={label}
            ariaLabel={`Rating at least ${v}`}
            active={min === v && max === undefined}
            onClick={() => onChange(min === v && max === undefined ? undefined : v, undefined)}
          />
        ))}
      </div>
      <BoundPair
        min={min}
        max={max}
        placeholderMin="ab"
        placeholderMax="bis"
        labelMin="Rating from"
        labelMax="Rating to"
        parse={(raw, cur) => {
          const n = Number(raw)
          return Number.isFinite(n) ? snapRating(n) : cur
        }}
        onCommit={(ratingMin, ratingMax) => onChange(ratingMin, ratingMax)}
      />
      <div role="status" className="mt-1 text-xs text-muted-foreground">
        {rangeStatusLabel(min, max, ' ★', 'Any rating')}
      </div>
    </div>
  )
}

/** Release-year facet over the years actually present in the library: decade
 *  presets for the coarse pick, exact numeric entry below. One entry + Enter =
 *  exactly that year; an empty side = open. Series dim filters the aggregated
 *  series start year, issues dim the per-book release date. */
function YearFacet({ min, max, lo, hi, onChange }: { min?: number; max?: number; lo: number; hi: number; onChange: (min?: number, max?: number) => void }) {
  const decades: [number, number, string][] = []
  for (let d = Math.floor(lo / 10) * 10; d <= hi; d += 10) {
    const end = Math.min(hi, d + 9)
    decades.push([d, end, `${String(d % 100).padStart(2, '0')}s`])
  }
  return (
    <div className="px-1 pt-1">
      <div className="flex flex-wrap gap-1">
        {decades.map(([d, end, label]) => (
          <PresetChip
            key={d}
            label={label}
            ariaLabel={`${d}s`}
            active={min === d && max === end}
            onClick={() => {
              const on = min === d && max === end
              onChange(on ? undefined : d, on ? undefined : end)
            }}
          />
        ))}
      </div>
      <BoundPair
        min={min}
        max={max}
        placeholderMin="ab"
        placeholderMax="bis"
        labelMin="Year from"
        labelMax="Year to"
        parse={(raw, cur) => {
          const n = Number(raw)
          // Non-integers / junk revert; anything outside the data span clamps in.
          return Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : cur
        }}
        onCommit={(yearMin, yearMax) => onChange(yearMin, yearMax)}
      />
      <div role="status" className="mt-1 text-xs text-muted-foreground">
        {rangeStatusLabel(min, max, '', 'Any year')}
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
