import { useState } from 'react'
import { BookmarkPlus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AddToReadListMenu } from './AddToReadListMenu'
import type { AddTarget } from '@/lib/komga/mutations'

/** Bookmark-plus trigger opening the add-to-list popover. Stops click propagation
 *  so it works inside the SeriesCard <Link> (and the portaled content too). */
export function AddToReadListButton({ target, className, label }: { target: AddTarget; className?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Add to read list"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        className={className}
      >
        <BookmarkPlus className="size-4" />
        {label && <span className="ml-2">{label}</span>}
      </PopoverTrigger>
      {/* stopPropagation only: the content is portaled, but React still bubbles
          through the component tree to the SeriesCard <Link>. preventDefault here
          would cancel the create-form's submit (form submission is the default
          action of a submit-button click) — see AddToReadListButton.test.tsx. */}
      <PopoverContent align="end" className="p-0" onClick={(e) => e.stopPropagation()}>
        <AddToReadListMenu target={target} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
