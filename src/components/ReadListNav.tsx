import { Link, useParams } from 'react-router-dom'
import { Star, List } from 'lucide-react'
import { useReadLists } from '@/lib/komga/queries'
import { DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'

/** The rail content on /readlists* routes: the user's lists, default first-class. */
export function ReadListNav() {
  const { data } = useReadLists()
  const { id } = useParams()
  const lists = data?.content ?? []
  return (
    <div className="min-h-0 overflow-auto">
      <div className="px-4 pb-1 pt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Deine Listen</div>
      {lists.map((l) => {
        const active = l.id === id
        const isDefault = l.name === DEFAULT_READLIST_NAME
        return (
          <Link key={l.id} to={`/readlists/${l.id}`}
            className={`flex items-center gap-2.5 px-4 py-1.5 text-sm ${active ? 'bg-secondary font-semibold' : 'hover:bg-accent'}`}>
            {isDefault ? <Star className="size-3.5 text-amber-400" /> : <List className="size-3.5 text-muted-foreground" />}
            <span className="truncate">{l.name}</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{l.bookIds.length}</span>
          </Link>
        )
      })}
      {lists.length === 0 && <div className="px-4 py-2 text-sm text-muted-foreground">Noch keine Listen.</div>}
    </div>
  )
}
