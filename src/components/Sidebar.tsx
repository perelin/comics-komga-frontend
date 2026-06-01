import { useState } from 'react'
import { Clock, Sparkles, BookOpen, Library, Layers, ListOrdered, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLibraries, useReadLists, useCollections } from '@/lib/komga/queries'
import { DEFAULT_FILTERS, type Filters } from '@/lib/komga/filters'

export function prettyLibraryName(name: string): string {
  const m = /^xCat:[A-Za-z]+\s+(.*)$/.exec(name)
  return m ? m[1].trim() : name
}

export type SmartFolder = 'continue' | 'recent' | 'unread'
export const SMART_PRESETS: Record<SmartFolder, { label: string; icon: typeof Clock; filters: Filters }> = {
  continue: { label: 'Continue reading', icon: Clock, filters: { ...DEFAULT_FILTERS, readStatus: ['IN_PROGRESS'] } },
  recent: { label: 'Recently added', icon: Sparkles, filters: { ...DEFAULT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' } },
  unread: { label: 'Unread', icon: BookOpen, filters: { ...DEFAULT_FILTERS, readStatus: ['UNREAD'] } },
}

function NavHead({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{children}</div>
}

function NavItem({ icon: Icon, label, count, active, onClick }: { icon: typeof Clock; label: string; count?: number | string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="flex-1 truncate text-left">{label}</span>
      {count != null && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">{count}</span>}
    </button>
  )
}

export function Sidebar({ filters, onPickSmart }: { filters: Filters; onPickSmart: (f: Filters) => void }) {
  const libs = useLibraries()
  const readlists = useReadLists()
  const collections = useCollections()
  const [rlQuery, setRlQuery] = useState('')
  const filteredReadlists = (readlists.data?.content ?? []).filter((r) =>
    r.name.toLowerCase().includes(rlQuery.toLowerCase()),
  )
  return (
    <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
      <NavHead>Smart folders</NavHead>
      {(Object.keys(SMART_PRESETS) as SmartFolder[]).map((k) => {
        const p = SMART_PRESETS[k]
        return <NavItem key={k} icon={p.icon} label={p.label} onClick={() => onPickSmart(p.filters)} />
      })}

      <NavHead>Libraries</NavHead>
      {(libs.data ?? []).map((l) => (
        <NavItem key={l.id} icon={Library} label={prettyLibraryName(l.name)}
          active={filters.libraryId.includes(l.id)}
          onClick={() => onPickSmart({ ...DEFAULT_FILTERS, libraryId: [l.id] })} />
      ))}

      {(collections.data?.content.length ?? 0) > 0 && (
        <>
          <NavHead>Collections</NavHead>
          {collections.data!.content.map((c) => <NavItem key={c.id} icon={Layers} label={c.name} count={c.seriesIds.length} />)}
        </>
      )}

      <NavHead>Read lists</NavHead>
      <div className="relative mb-1 px-1">
        <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
        <Input value={rlQuery} onChange={(e) => setRlQuery(e.target.value)} placeholder="Filter read lists…" className="h-8 pl-8 text-sm" />
      </div>
      {filteredReadlists.slice(0, 50).map((r) => (
        <NavItem key={r.id} icon={ListOrdered} label={r.name} count={r.bookIds.length} />
      ))}
    </ScrollArea>
  )
}
