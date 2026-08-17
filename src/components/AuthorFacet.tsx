import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthorSearch } from '@/lib/komga/queries'

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

/** Creator filter: server-backed name typeahead (GET /authors/names) + selected
 *  chips. Selected names are OR-ed by the query layer (everything any of them
 *  worked on). */
export function AuthorFacet({ authors, onChange }: { authors: string[]; onChange: (next: string[]) => void }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data, isFetching } = useAuthorSearch(debounced)
  const results = (data ?? []).filter((name: string) => !authors.includes(name))
  const open = q.trim().length >= 2

  return (
    <div className="flex flex-col gap-1.5">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creators…" className="h-7 text-sm" />
      {open && (
        <div className="flex flex-col gap-0.5">
          {isFetching && <span className="px-1 py-1 text-sm text-muted-foreground">…</span>}
          {!isFetching && results.length === 0 && (
            <span className="px-1 py-1 text-sm text-muted-foreground">No matches</span>
          )}
          {results.map((name: string) => (
            <button key={name} type="button" aria-label={`add ${name}`}
              onClick={() => onChange(toggle(authors, name))}
              className="flex cursor-pointer items-center rounded px-1 py-1 text-left text-sm text-muted-foreground outline-none hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <span className="truncate">{name}</span>
            </button>
          ))}
        </div>
      )}
      {authors.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {authors.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1">
              <span className="truncate">{name}</span>
              <button type="button" onClick={() => onChange(toggle(authors, name))} aria-label={`remove ${name}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
