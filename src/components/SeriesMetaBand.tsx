import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { creditNames } from '@/lib/komga/mapping'
import { parseFormat } from '@/lib/komga/format'
import { allTags, allGenres } from '@/lib/komga/tags'
import { creditCounts, sumPages, formatIndicator } from '@/lib/komga/books'
import { facetHref } from '@/lib/komga/filters'
import { MetaChips } from '@/components/MetaChips'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

/** A credited person: the name plus how many of the series' volumes credit it
 *  with the block's role (0 = no per-issue metadata). */
interface Credit {
  name: string
  count: number
}

/** A credit block lists every credited person (no "+N" cap, no truncation),
 *  ranked by issue count; a fact block carries a single Publisher/Format-style
 *  value. */
type Block =
  | { label: string; credits: Credit[] }
  | { label: string; value: string; href?: string }

function isCredits(b: Block): b is Extract<Block, { credits: Credit[] }> {
  return 'credits' in b
}

/** Metadata band between the hero and the tabs: one wrapping row of credit /
 *  stat cards + the complete genre and tag list as chips. Every card is sized
 *  to its content (flex-wrap, not a fixed grid) and lists ALL its names as
 *  facet links, ranked by how many volumes credit them (stamina first, guests
 *  last; "regulars" carry an "(n)" tally, one-issue credits just their name) —
 *  mirroring Komga's own series page, which hides nothing. The card set itself
 *  is a curated subset (writer / art / colors / editor).
 */
export function SeriesMetaBand({ dto, books }: { dto: KomgaSeriesDto; books: KomgaBookDto[] }) {
  const authors = dto.booksMetadata.authors
  const writers = creditNames(authors, 'writer')
  const art = creditNames(authors, 'penciller')
  const artNames = art.length > 0 ? art : creditNames(authors, 'inker')
  const colors = creditNames(authors, 'colorist')
  const editors = creditNames(authors, 'editor')
  const format = formatIndicator(sumPages(books), books.length, parseFormat(dto.metadata.tags))
  const tallies = useMemo(() => creditCounts(books), [books])

  /** Enrich names with per-issue tallies, ranked: most issues first, ties A–Z. */
  const rankCredits = (names: string[], role: string): Credit[] => {
    const perName = tallies.get(role)
    return names
      .map((name) => ({ name, count: perName?.get(name) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }

  const blocks: Block[] = []
  if (writers.length > 0) blocks.push({ label: 'Writer', credits: rankCredits(writers, 'writer') })
  if (artNames.length > 0) {
    blocks.push({ label: 'Art', credits: rankCredits(artNames, art.length > 0 ? 'penciller' : 'inker') })
  }
  if (colors.length > 0) blocks.push({ label: 'Colors', credits: rankCredits(colors, 'colorist') })
  if (editors.length > 0) blocks.push({ label: 'Editor', credits: rankCredits(editors, 'editor') })
  if (dto.metadata.publisher) {
    blocks.push({
      label: 'Publisher',
      value: dto.metadata.publisher,
      href: facetHref({ publisher: [dto.metadata.publisher] }),
    })
  }
  if (format) blocks.push({ label: 'Format', value: format })

  const tags = allTags(dto)
  const genres = allGenres(dto)

  if (blocks.length === 0 && tags.length === 0 && genres.length === 0) return null

  return (
    <div className="px-4 pb-5 md:px-6">
      {blocks.length > 0 && (
        <div className="flex flex-wrap items-start gap-2.5">
          {blocks.map((b) => (
            <div key={b.label} className="max-w-full rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {b.label}
                {isCredits(b) && (
                  <span className="ml-1.5 text-[11px] tracking-normal tabular-nums">{b.credits.length}</span>
                )}
              </div>
              <div className="mt-0.5 text-sm leading-relaxed text-foreground/90">
                {isCredits(b) ? (
                  b.credits.map(({ name, count }, i) => (
                    <span key={`${name}-${i}`}>
                      {i > 0 && ', '}
                      <Link
                        to={facetHref({ authors: [name] })}
                        className="hover:text-foreground hover:underline underline-offset-2"
                      >
                        {name}
                      </Link>
                      {count > 1 && (
                        <span className="ml-1 text-xs tabular-nums text-muted-foreground">({count})</span>
                      )}
                    </span>
                  ))
                ) : b.href ? (
                  <Link to={b.href} className="hover:underline">{b.value}</Link>
                ) : (
                  b.value
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {(genres.length > 0 || tags.length > 0) && (
        <MetaChips genres={genres} tags={tags} className="mt-3" />
      )}
    </div>
  )
}
