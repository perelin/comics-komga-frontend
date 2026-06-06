import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookmarkPlus, Plus, Star, ChevronRight } from 'lucide-react'
import { useReadLists } from '@/lib/komga/queries'
import { useAddToReadList, type AddTarget } from '@/lib/komga/mutations'
import { DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'
import { Input } from '@/components/ui/input'

/** The add-to-list popover body. Add-only actions in v1: quick-add to the default
 *  queue, add to a thematic list, or create a new seeded list. */
export function AddToReadListMenu({ target, onDone }: { target: AddTarget; onDone?: () => void }) {
  const lists = useReadLists()
  const add = useAddToReadList()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const run = (vars: Parameters<typeof add.mutate>[0]) => {
    add.mutate(vars)
    onDone?.()
  }

  return (
    <div className="w-60 text-sm">
      <div className="px-3 pb-1.5 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Zu Read List</div>
      <button
        type="button"
        onClick={() => run({ target, listId: 'default' })}
        className="flex w-full items-center gap-2.5 px-3 py-2 font-medium text-amber-400 hover:bg-accent"
      >
        <BookmarkPlus className="size-4" /> Schnell zu „To Read"
      </button>
      <div className="my-1 h-px bg-border" />
      <div className="max-h-52 overflow-auto">
        {(lists.data?.content ?? [])
          .filter((l) => l.name !== DEFAULT_READLIST_NAME)
          .map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => run({ target, listId: l.id })}
              className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent"
            >
              <span className="truncate">{l.name}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{l.bookIds.length}</span>
            </button>
          ))}
      </div>
      <div className="my-1 h-px bg-border" />
      {creating ? (
        <form
          className="flex items-center gap-1.5 px-2 py-1.5"
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) run({ target, newListName: name.trim() }) }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Listenname…" className="h-8" />
          <button type="submit" aria-label="Liste anlegen" className="rounded-md bg-primary px-2 py-1.5 text-primary-foreground">
            <Plus className="size-4" />
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)} className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent">
          <Plus className="size-4" /> Neue Liste…
        </button>
      )}
      <Link to="/readlists" onClick={onDone} className="flex w-full items-center gap-2.5 px-3 py-2 text-muted-foreground hover:bg-accent">
        <Star className="size-4" /> Listen verwalten <ChevronRight className="ml-auto size-4" />
      </Link>
    </div>
  )
}
