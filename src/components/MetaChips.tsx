import { Link } from 'react-router-dom'
import { tagHref } from '@/lib/komga/tags'
import { facetHref } from '@/lib/komga/filters'
import { Badge } from '@/components/ui/badge'

/** The classification chip row: genres first, then tags. Three visual tiers,
 *  strongest first:
 *
 *  1. genres — a curated taxonomy and a first-class filter facet (filled bright)
 *  2. free-form tags — content, but uncontrolled vocabulary (filled muted)
 *  3. convention tags (`format:*`, `rating:*`) — machine-written (outline)
 *
 *  Nothing is hidden: this is the complete list, mirroring the tag row on
 *  Komga's own series page. Genres always link — `genre` is a real facet; for
 *  tags see `tagHref`. */
export function MetaChips({
  genres = [], tags, className = '',
}: { genres?: string[]; tags: string[]; className?: string }) {
  if (genres.length === 0 && tags.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {genres.map((g) => (
        <Badge key={`genre:${g}`} variant="default" render={<Link to={facetHref({ genre: [g] })} />}>
          {g}
        </Badge>
      ))}
      {tags.map((t) => {
        const convention = t.startsWith('format:') || t.startsWith('rating:')
        const variant = convention ? 'outline' : 'secondary'
        const href = tagHref(t)
        return href ? (
          <Badge key={t} variant={variant} render={<Link to={href} />}>{t}</Badge>
        ) : (
          <Badge key={t} variant={variant}>{t}</Badge>
        )
      })}
    </div>
  )
}
