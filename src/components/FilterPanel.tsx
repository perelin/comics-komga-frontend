import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { resetFiltersKeepingSort, type Filters } from '@/lib/komga/filters'
import type { ReadStatus, SeriesStatus } from '@/lib/komga/types'
import { prettyLibraryName } from '@/lib/library'
import { useGenres, usePublishers, useAgeRatings, useLibraries } from '@/lib/komga/queries'
import { AuthorFacet } from './AuthorFacet'

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3">
      <div className="mb-1.5 text-sm font-medium">{title}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
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

const READ_STATUS: [ReadStatus, string][] = [['UNREAD', 'Unread'], ['IN_PROGRESS', 'In progress'], ['READ', 'Read']]
const STATUS: [SeriesStatus, string][] = [['ONGOING', 'Ongoing'], ['ENDED', 'Ended'], ['HIATUS', 'Hiatus'], ['ABANDONED', 'Abandoned']]

export function FilterPanel({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const genres = useGenres().data ?? []
  const publishers = usePublishers().data ?? []
  const ageRatings = useAgeRatings().data ?? []
  const libraries = useLibraries().data ?? []
  const [genreQ, setGenreQ] = useState('')
  const [pubQ, setPubQ] = useState('')

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-semibold">Filters</span>
        <Button variant="ghost" size="sm" className="h-7" onClick={() => onChange(resetFiltersKeepingSort(filters))}>Reset</Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4">
        <Facet title="Read status">
          {READ_STATUS.map(([k, l]) => <Opt key={k} label={l} checked={filters.readStatus.includes(k)} onToggle={() => onChange({ ...filters, readStatus: toggle(filters.readStatus, k) })} />)}
        </Facet>
        <Facet title="Creators">
          <AuthorFacet authors={filters.authors} onChange={(authors) => onChange({ ...filters, authors })} />
        </Facet>
        <Facet title="Library">
          {libraries.map((lib) => <Opt key={lib.id} label={prettyLibraryName(lib.name)} checked={filters.libraryId.includes(lib.id)} onToggle={() => onChange({ ...filters, libraryId: toggle(filters.libraryId, lib.id) })} />)}
        </Facet>
        <Facet title="Status">
          {STATUS.map(([k, l]) => <Opt key={k} label={l} checked={filters.status.includes(k)} onToggle={() => onChange({ ...filters, status: toggle(filters.status, k) })} />)}
        </Facet>
        <Facet title="Genre">
          <Input value={genreQ} onChange={(e) => setGenreQ(e.target.value)} placeholder="Search genres…" className="mb-1 h-7 text-sm" />
          {genres.filter((g) => g.toLowerCase().includes(genreQ.toLowerCase())).slice(0, 100).map((g) => (
            <Opt key={g} label={g} checked={filters.genre.includes(g)} onToggle={() => onChange({ ...filters, genre: toggle(filters.genre, g) })} />
          ))}
        </Facet>
        <Facet title="Publisher">
          <Input value={pubQ} onChange={(e) => setPubQ(e.target.value)} placeholder="Search publishers…" className="mb-1 h-7 text-sm" />
          {publishers.filter((p) => p.toLowerCase().includes(pubQ.toLowerCase())).slice(0, 100).map((p) => (
            <Opt key={p} label={p} checked={filters.publisher.includes(p)} onToggle={() => onChange({ ...filters, publisher: toggle(filters.publisher, p) })} />
          ))}
        </Facet>
        <Facet title="Age rating">
          {ageRatings.map((a) => <Opt key={a} label={`${a}+`} checked={filters.ageRating.includes(String(a))} onToggle={() => onChange({ ...filters, ageRating: toggle(filters.ageRating, String(a)) })} />)}
        </Facet>
        <Facet title="Format">
          <Opt label="One-shots only" checked={filters.oneshot === true} onToggle={() => onChange({ ...filters, oneshot: filters.oneshot === true ? undefined : true })} />
        </Facet>
      </ScrollArea>
    </aside>
  )
}
