import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Star, X, Trash2, GripVertical } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AppShell } from '@/components/AppShell'
import { ReadListNav } from '@/components/ReadListNav'
import { useReadList, useReadListBooks } from '@/lib/komga/queries'
import { useUpdateReadList, useDeleteReadList } from '@/lib/komga/mutations'
import { removeReadIds, moveId, DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'
import { bookCoverUrl } from '@/lib/komga/books'
import { komgaReaderUrl } from '@/lib/komga/reader'
import { CoverImage } from '@/components/CoverImage'
import { OpenInPanels } from '@/components/OpenInPanels'

/** A drag-sortable row; the grip is the drag handle. */
function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="grid grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_2.25rem] items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-accent"
    >
      <button {...attributes} {...listeners} aria-label="Verschieben" className="cursor-grab text-muted-foreground"><GripVertical className="size-4" /></button>
      {children}
    </div>
  )
}

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

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = rl.bookIds.indexOf(String(active.id))
    const to = rl.bookIds.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    update.mutate({ bookIds: moveId(rl.bookIds, from, to) })
  }

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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={rl.bookIds} strategy={verticalListSortingStrategy}>
                {books.map((b) => (
                  <SortableRow key={b.id} id={b.id}>
                    <a href={komgaReaderUrl(b.id)} target="_blank" rel="noreferrer" className="h-9 w-6 overflow-hidden rounded-[2px] border border-border">
                      <CoverImage src={bookCoverUrl(b.id)} alt="" />
                    </a>
                    <a href={komgaReaderUrl(b.id)} target="_blank" rel="noreferrer" className="truncate text-sm hover:underline">
                      {b.metadata.title || b.name}
                      {b.readProgress?.completed && <span className="ml-1 text-xs text-green-500">· gelesen</span>}
                    </a>
                    <button onClick={() => remove(b.id)} aria-label="Entfernen" className="flex justify-center text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
                  </SortableRow>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </AppShell>
  )
}
