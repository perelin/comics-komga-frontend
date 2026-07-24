import { Link } from 'react-router-dom'
import { creditNames, formatCredit } from '@/lib/komga/mapping'
import { parseFormat } from '@/lib/komga/format'
import { sumPages, formatIndicator } from '@/lib/komga/books'
import { facetHref } from '@/lib/komga/filters'
import { Badge } from '@/components/ui/badge'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

interface Block { label: string; value: string; href?: string }

/** Curated metadata band between the hero and the tabs: one row of stat
 *  blocks (credits, publisher, format) + one row of tag chips. The Metadata
 *  tab keeps the complete raw table; this is the readable subset. */
export function SeriesMetaBand({ dto, books }: { dto: KomgaSeriesDto; books: KomgaBookDto[] }) {
  const authors = dto.booksMetadata.authors
  const writers = creditNames(authors, 'writer')
  const art = creditNames(authors, 'penciller')
  const artNames = art.length > 0 ? art : creditNames(authors, 'inker')
  const colors = creditNames(authors, 'colorist')
  const editors = creditNames(authors, 'editor')
  const format = formatIndicator(sumPages(books), books.length, parseFormat(dto.metadata.tags))

  const blocks: Block[] = []
  const writer = formatCredit(writers)
  if (writer) blocks.push({ label: 'Writer', value: writer, href: facetHref({ authors: [writers[0]] }) })
  const artist = formatCredit(artNames)
  if (artist) blocks.push({ label: 'Art', value: artist, href: facetHref({ authors: [artNames[0]] }) })
  const colorist = formatCredit(colors)
  if (colorist) blocks.push({ label: 'Colors', value: colorist })
  const editor = formatCredit(editors, 1)
  if (editor) blocks.push({ label: 'Editor', value: editor })
  if (dto.metadata.publisher) {
    blocks.push({ label: 'Publisher', value: dto.metadata.publisher, href: facetHref({ publisher: [dto.metadata.publisher] }) })
  }
  if (format) blocks.push({ label: 'Format', value: format })

  const tags = [...new Set([...dto.metadata.tags, ...dto.booksMetadata.tags])]
    .filter((t) => !t.startsWith('rating:') && !t.startsWith('format:'))

  if (blocks.length === 0 && tags.length === 0) return null

  return (
    <div className="px-4 pb-5 md:px-6">
      {blocks.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
          {blocks.map((b) => (
            <div key={b.label} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.label}</div>
              <div className="mt-0.5 truncate text-sm font-medium" title={b.value}>
                {b.href ? (
                  <Link to={b.href} className="hover:underline">{b.value}</Link>
                ) : (
                  b.value
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
        </div>
      )}
    </div>
  )
}
