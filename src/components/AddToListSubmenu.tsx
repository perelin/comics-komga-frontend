import { useNavigate } from 'react-router-dom'
import { BookmarkPlus, Plus, Star } from 'lucide-react'
import {
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useReadLists } from '@/lib/komga/queries'
import { useAddToReadList, type AddTarget } from '@/lib/komga/mutations'
import { DEFAULT_READLIST_NAME } from '@/lib/komga/readlists'

/** "Zu Liste" submenu for row action dropdowns: quick-add to the default queue,
 *  add the target to any thematic list, create a new seeded list, or jump to the
 *  list manager. Mirrors AddToReadListMenu (the series/hero popover) so single
 *  books can target a specific list too.
 *
 *  Creation is delegated via `onCreateNew` because the submenu unmounts when its
 *  item is clicked — the caller keeps the dialog mounted outside the menu. */
export function AddToListSubmenu({ target, onCreateNew }: { target: AddTarget; onCreateNew: () => void }) {
  const lists = useReadLists()
  const add = useAddToReadList()
  const nav = useNavigate()
  const thematic = (lists.data?.content ?? []).filter((l) => l.name !== DEFAULT_READLIST_NAME)

  return (
    <DropdownMenuSub>
      {/* Hover-open disabled: a plain click is the discoverable, deterministic path
          (and the only one jsdom can drive in tests). */}
      <DropdownMenuSubTrigger openOnHover={false}>
        <BookmarkPlus className="size-4" /> Zu Liste
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        <DropdownMenuItem onClick={() => add.mutate({ target, listId: 'default' })}>
          <Star className="size-4 text-amber-400" /> <span className="truncate">Schnell zu „To Read"</span>
        </DropdownMenuItem>
        {thematic.length > 0 && <DropdownMenuSeparator />}
        {thematic.map((l) => (
          <DropdownMenuItem key={l.id} onClick={() => add.mutate({ target, listId: l.id })}>
            <span className="truncate">{l.name}</span>
            <span className="ml-auto pl-3 text-xs tabular-nums text-muted-foreground">{l.bookIds.length}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateNew}>
          <Plus className="size-4" /> Neue Liste…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => nav('/readlists')}>
          <Star className="size-4" /> Listen verwalten
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
