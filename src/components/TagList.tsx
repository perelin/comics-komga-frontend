import { Link } from 'react-router-dom'
import { tagHref } from '@/lib/komga/tags'
import { Badge } from '@/components/ui/badge'

/** The complete tag list as chips. Convention tags (`format:*`, `rating:*`) get
 *  the quieter outline treatment so free-form content tags still read first,
 *  but nothing is hidden — this is the "all tags" list. `format:*` chips link
 *  to the matching filter; see `tagHref` for why the others don't. */
export function TagList({ tags, className = '' }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
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
