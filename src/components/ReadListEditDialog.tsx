import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateReadList } from '@/lib/komga/mutations'
import type { KomgaReadListDto } from '@/lib/komga/types'

/** Edit a read list's name + summary. Mounted only while editing (list is always
 *  non-null), so useUpdateReadList runs with a real id — never conditionally. */
export function ReadListEditDialog({ list, onClose }: { list: KomgaReadListDto; onClose: () => void }) {
  const [name, setName] = useState(list.name)
  const [summary, setSummary] = useState(list.summary ?? '')
  const update = useUpdateReadList(list.id)
  const canSave = name.trim().length > 0

  const save = () => {
    if (!canSave) return
    update.mutate(
      { name: name.trim(), summary },
      { onSuccess: () => { toast.success('Liste aktualisiert'); onClose() } },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liste bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="grid gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Name</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Listenname…" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Beschreibung</span>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Optional…" />
          </label>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Abbrechen</DialogClose>
            <Button type="submit" disabled={!canSave}>Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
