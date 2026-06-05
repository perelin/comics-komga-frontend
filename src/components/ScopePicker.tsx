import { useMemo, useState } from 'react'
import { Library, X, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLibraries } from '@/lib/komga/queries'
import { groupLibraries, parseLibraryName } from '@/lib/library'

const ALL_LABEL = 'All libraries'

/** Top-bar single-select library scope. Selecting a library narrows the corpus
 *  but PRESERVES the active facets + search; "All"/✕ clears it. Grouped by the
 *  Franchise/Publisher/Universe taxonomy; unavailable libraries are hidden. */
export function ScopePicker({ value, onChange }: { value: string | undefined; onChange: (libraryId: string | undefined) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const libs = useLibraries().data ?? []
  const groups = useMemo(() => groupLibraries(libs), [libs])

  const active = useMemo(() => {
    const lib = libs.find((l) => l.id === value)
    return lib ? parseLibraryName(lib.name) : undefined
  }, [libs, value])

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(
    () => groups
      .map((g) => ({ ...g, libraries: g.libraries.filter((l) => l.label.toLowerCase().includes(needle)) }))
      .filter((g) => g.libraries.length > 0),
    [groups, needle],
  )

  const pick = (id: string | undefined) => { onChange(id); setOpen(false); setQ('') }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="lg" className="max-w-[15rem] gap-1.5" aria-label="Library scope" />}>
        <Library className="size-4 shrink-0 opacity-80" />
        <span className="truncate">{active ? `${active.group} · ${active.label}` : ALL_LABEL}</span>
        {value ? (
          <span role="button" tabIndex={0} aria-label="Clear scope"
            className="ml-0.5 rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => { e.stopPropagation(); pick(undefined) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(undefined) } }}>
            <X className="size-3.5" />
          </span>
        ) : (
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-0">
        <div className="p-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search libraries…" className="h-8 text-sm" autoFocus />
        </div>
        <ScrollArea className="max-h-72 px-1 pb-2">
          <button type="button" onClick={() => pick(undefined)}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm ${value === undefined ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
            <Library className="size-4 shrink-0 opacity-80" />
            <span className="truncate text-left">{ALL_LABEL}</span>
          </button>
          {filtered.map((g) => (
            <div key={g.group}>
              <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.group}</div>
              {g.libraries.map((l) => (
                <button key={l.id} type="button" onClick={() => pick(l.id)}
                  className={`flex h-8 w-full items-center rounded-md px-2 text-sm ${value === l.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
                  <span className="truncate text-left">{l.label}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && needle !== '' && (
            <div className="px-2 py-3 text-sm text-muted-foreground">No libraries match.</div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
