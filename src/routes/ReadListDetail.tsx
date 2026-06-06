import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Star, X, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { ReadListNav } from '@/components/ReadListNav'
import { useReadList, useReadListBooks } from '@/lib/komga/queries'
import { useUpdateReadList, useDeleteReadList } from '@/lib/komga/mutations'
import { removeReadIds, DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'
import { bookCoverUrl } from '@/lib/komga/books'
import { komgaReaderUrl } from '@/lib/komga/reader'
import { CoverImage } from '@/components/CoverImage'
import { OpenInPanels } from '@/components/OpenInPanels'

export function ReadListDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const list = useReadList(id)
  const booksQ = useReadListBooks(id)
  const update = useUpdateReadList(id)
  const del = useDeleteReadList()

  if (list.isLoading) return <AppShell sidebar={<ReadListNav />}><div className="p-6 text-sm text-muted-foreground">Lädt…</div></AppShell>
  if (list.isError || !list.data) return <AppShell sidebar={<ReadListNav />}><div className="p-6 text-sm text-muted-foreground">Liste nicht gefunden.</div></AppShell>

  const rl = list.data
  const books = booksQ.data?.content ?? []
  const isDefault = rl.name === DEFAULT_READLIST_NAME
  const remove = (bookId: string) => update.mutate({ bookIds: rl.bookIds.filter((x) => x !== bookId) })
  const removeRead = () => update.mutate({ bookIds: removeReadIds(rl.bookIds, books) })
  const onDelete = () => del.mutate(rl.id, { onSuccess: () => nav('/readlists') })

  return (
    <AppShell sidebar={<ReadListNav />}>
      <div className="overflow-auto p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={() => nav('/readlists')} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Zurück"><ChevronLeft className="size-4" /></button>
          <h1 className="flex items-center gap-1.5 text-lg font-bold">
            {isDefault && <Star className="size-4 text-amber-400" />}{rl.name}
          </h1>
          <span className="text-sm text-muted-foreground tabular-nums">{rl.bookIds.length} Hefte</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={removeRead} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-accent">
              Gelesene entfernen
            </button>
            <OpenInPanels name={rl.name} />
            <button onClick={onDelete} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent" aria-label="Liste löschen">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="text-sm text-muted-foreground">Leere Liste.</div>
        ) : (
          <div className="rounded-md border border-border">
            {books.map((b, i) => (
              <div key={b.id} className="grid grid-cols-[2rem_2.75rem_minmax(0,1fr)_2.25rem] items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-accent">
                <span className="text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <a href={komgaReaderUrl(b.id)} target="_blank" rel="noreferrer" className="h-9 w-6 overflow-hidden rounded-[2px] border border-border">
                  <CoverImage src={bookCoverUrl(b.id)} alt="" />
                </a>
                <a href={komgaReaderUrl(b.id)} target="_blank" rel="noreferrer" className="truncate text-sm hover:underline">
                  {b.metadata.title || b.name}
                  {b.readProgress?.completed && <span className="ml-1 text-xs text-green-500">· gelesen</span>}
                </a>
                <button onClick={() => remove(b.id)} aria-label="Entfernen" className="flex justify-center text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
