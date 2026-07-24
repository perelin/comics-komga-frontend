// The series tag list. Komga's own series page lists every tag verbatim in its
// primary metadata block; we mirror that instead of hiding the convention tags
// (`format:*`, `rating:*`), because on this library those are frequently the
// *only* tags a series has — filtering them left the tag list empty on ~77% of
// series, i.e. no tag list at all.
import { isFormatKind } from './format'
import { facetHref } from './filters'
import type { KomgaSeriesDto } from './types'

/** Tag group, in display order: free-form content tags first, machine-written
 *  convention tags last — so the chip row's visual weight falls off
 *  monotonically (see the tiers in `MetaChips`). Series whose only tags are
 *  convention tags keep the alphabetical order Komga renders them in. */
function group(tag: string): number {
  if (tag.startsWith('format:')) return 1
  if (tag.startsWith('rating:')) return 2
  return 0
}

/** Every tag on a series — series-level *and* book-level, deduped. Komga stores
 *  tags lowercase and we render them verbatim, so this list is comparable
 *  one-to-one with the tag row on Komga's series page. */
export function allTags(dto: KomgaSeriesDto): string[] {
  const tags = [...new Set([...dto.metadata.tags, ...dto.booksMetadata.tags])]
  return tags.sort((a, b) => group(a) - group(b) || a.localeCompare(b))
}

/** The series' genres, sorted. Series-level only — Komga's `booksMetadata`
 *  carries no genres field, so unlike tags there is nothing to union in. */
export function allGenres(dto: KomgaSeriesDto): string[] {
  return [...dto.metadata.genres].sort((a, b) => a.localeCompare(b))
}

/** Where a tag chip links, or undefined when the tag has no matching facet.
 *
 *  Only `format:*` is linkable, deliberately:
 *  - `rating:*` carries non-numeric buckets (`rating:nomatch`, `rating:check`)
 *    that no rating bound can express, plus stray 1-decimal values the 0.05
 *    grid in `ratingFacet` never matches — a chip that returns nothing is worse
 *    than a chip that doesn't invite a click.
 *  - free-form tags (`star trek`, `claude-tagged`, …) have no `tag` facet in
 *    `Filters` at all. */
export function tagHref(tag: string): string | undefined {
  if (tag === 'format:mixed') return facetHref({ formatMixed: true })
  if (!tag.startsWith('format:')) return undefined
  const kind = tag.slice('format:'.length)
  return isFormatKind(kind) ? facetHref({ format: [kind] }) : undefined
}
