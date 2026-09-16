import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAddToReadList, type AddTarget } from '@/lib/komga/mutations'

/** Create a new read list seeded with a target (a single book or a whole series).
 *  The inline form in AddToReadListMenu cannot live inside a DropdownMenu
 *  submenu — the menu unmounts on item click, taking the form state with it — so
 *  row action menus delegate creation to this dialog instead. */
export function ReadListCreateDialog({ target, onClose }: { target: AddTarget; onClose: () => void }) {
  const [name, setName] = useState('')
  const add = useAddToReadList()
  const canSave = name.trim().length > 0

  const save = () => {
    if (!canSave) return
    add.mutate({ target, newListName: name.trim() }, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Liste</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Name</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Listenname…" />
          </label>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Abbrechen</DialogClose>
            <Button type="submit" disabled={!canSave || add.isPending}>Anlegen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
