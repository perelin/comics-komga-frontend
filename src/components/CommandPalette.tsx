import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Library, BookOpen } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSearchSeries, useLibraries } from '@/lib/komga/queries'
import { prettyLibraryName } from '@/lib/library'

// CommandDialog in this codebase wraps Dialog but does NOT include a Command
// primitive, so shouldFilter cannot be forwarded through it. We compose
// Dialog + Command directly so we can set shouldFilter={false} — server-side
// search means cmdk's default fuzzy filter must be disabled.

const RECENTS_KEY = 'kg.recents'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const results = useSearchSeries(q)
  const libs = useLibraries()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const pushRecent = (id: string, title: string) => {
    try {
      const cur: { id: string; title: string }[] = JSON.parse(
        localStorage.getItem(RECENTS_KEY) ?? '[]',
      )
      const next = [{ id, title }, ...cur.filter((r) => r.id !== id)].slice(0, 5)
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const goSeries = (id: string, title: string) => {
    pushRecent(id, title)
    setOpen(false)
    navigate(`/series/${id}`)
  }

  let recents: { id: string; title: string }[] = []
  try {
    recents = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]')
  } catch {
    recents = []
  }

  return (
    // base-ui Dialog.Root uses onOpenChange(open, eventDetails) — we only need open
    <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
      <DialogHeader className="sr-only">
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>Search for a series or jump to a library…</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0"
        showCloseButton={false}
      >
        {/* Command with shouldFilter={false} — results come from the server */}
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Search series, jump to a library…" />
          <CommandList>
            <CommandEmpty>{results.isFetching ? 'Searching…' : 'No results.'}</CommandEmpty>
            {q.trim() === '' && recents.length > 0 && (
              <CommandGroup heading="Recent series">
                {recents.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`recent-${r.id}`}
                    onSelect={() => goSeries(r.id, r.title)}
                  >
                    <BookOpen className="mr-2 size-4" />
                    {r.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {(results.data?.content.length ?? 0) > 0 && (
              <CommandGroup heading="Series">
                {results.data!.content.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.id}
                    onSelect={() => goSeries(s.id, s.metadata.title)}
                  >
                    <BookOpen className="mr-2 size-4" />
                    {s.metadata.title}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {s.booksCount} books
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Jump to library">
              {(libs.data ?? []).slice(0, 8).map((l) => (
                <CommandItem
                  key={l.id}
                  value={`lib-${l.id}`}
                  onSelect={() => {
                    setOpen(false)
                    navigate(`/?libraryId=${l.id}`)
                  }}
                >
                  <Library className="mr-2 size-4" />
                  {prettyLibraryName(l.name)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
