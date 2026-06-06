import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ReadListNav } from '@/components/ReadListNav'
import { useReadLists } from '@/lib/komga/queries'
import { DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'

export function ReadLists() {
  const { data, isLoading } = useReadLists()
  const lists = data?.content ?? []
  return (
    <AppShell sidebar={<ReadListNav />}>
      <div className="overflow-auto p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-lg font-bold">Read Lists</h1>
          <span className="text-sm text-muted-foreground tabular-nums">{lists.length}</span>
        </div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Lädt…</div>
        ) : lists.length === 0 ? (
          <div className="max-w-md text-sm text-muted-foreground">
            Noch keine Listen. Füge ein Comic aus einer Serie über das ⊕-Lesezeichen hinzu —
            die erste Liste entsteht dabei automatisch. In Panels liest du sie dann über OPDS.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {lists.map((l) => (
              <Link key={l.id} to={`/readlists/${l.id}`}
                className="overflow-hidden rounded-lg border border-border bg-card hover:border-white/20">
                <div className="h-28 w-full overflow-hidden bg-muted">
                  <img src={`/komga/api/v1/readlists/${l.id}/thumbnail`} alt="" className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {l.name === DEFAULT_READLIST_NAME && <Star className="size-3.5 text-amber-400" />}
                    <span className="truncate">{l.name}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">{l.bookIds.length} Hefte</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
