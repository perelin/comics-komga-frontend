import { useState } from 'react'
import { Share, Copy, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const OPDS_URL = 'https://komga.p2lab.com/opds/v1.2/catalog'

/** Informational helper: shows the Komga OPDS catalog URL to paste into Panels.
 *  Panels has no deep link, so this just makes the one-time OPDS setup easy. */
export function OpenInPanels({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(OPDS_URL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-accent">
        <Share className="size-4" /> In Panels öffnen
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <p className="mb-2 font-medium">In Panels lesen</p>
        <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
          <li>Panels → Library → Connect Service → OPDS</li>
          <li>Server-Adresse einfügen (Komga-User + Passwort):</li>
        </ol>
        <div className="my-2 flex items-center gap-2 rounded-md border border-border bg-secondary px-2 py-1.5">
          <code className="flex-1 truncate text-xs">{OPDS_URL}</code>
          <button onClick={copy} aria-label="Kopieren" className="text-muted-foreground hover:text-foreground">
            {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">→ dann <b>Read Lists → „{name}"</b> öffnen.</p>
      </PopoverContent>
    </Popover>
  )
}
