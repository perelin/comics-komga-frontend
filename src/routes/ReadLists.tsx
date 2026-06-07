import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ReadListNav } from '@/components/ReadListNav'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ReadListEditDialog } from '@/components/ReadListEditDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useReadLists } from '@/lib/komga/queries'
import { useDeleteReadList } from '@/lib/komga/mutations'
import { DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'
import type { KomgaReadListDto } from '@/lib/komga/types'

export function ReadLists() {
  const { data, isLoading } = useReadLists()
  const lists = data?.content ?? []
  const del = useDeleteReadList()
  const [editing, setEditing] = useState<KomgaReadListDto | null>(null)
  const [deleting, setDeleting] = useState<KomgaReadListDto | null>(null)

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
              <div key={l.id} className="group relative">
                <Link to={`/readlists/${l.id}`}
                  className="block overflow-hidden rounded-lg border border-border bg-card hover:border-white/20">
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
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button
                      aria-label="Listenaktionen"
                      className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
                    />
                  }>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(l)}>
                      <Pencil className="size-4" /> Umbenennen / bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(l)}>
                      <Trash2 className="size-4" /> Liste löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        {editing && <ReadListEditDialog list={editing} onClose={() => setEditing(null)} />}
        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(o) => { if (!o) setDeleting(null) }}
          title="Liste löschen?"
          description={deleting ? <>„{deleting.name}“ wird dauerhaft gelöscht.</> : null}
          confirmLabel="Löschen"
          destructive
          onConfirm={() => { if (deleting) del.mutate(deleting.id) }}
        />
      </div>
    </AppShell>
  )
}
