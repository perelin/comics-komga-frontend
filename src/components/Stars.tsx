import { Star, TriangleAlert } from 'lucide-react'
import type { Rating } from '@/lib/komga/mapping'

export function Stars({ rating, size = 14 }: { rating?: Rating; size?: number }) {
  if (!rating) return null
  const pct = Math.max(0, Math.min(100, (rating.value / 5) * 100))
  return (
    <span data-testid="stars" className="inline-flex items-center gap-1.5">
      <span className="relative inline-block" style={{ height: size }}>
        <span className="flex text-muted-foreground/30">
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} className="shrink-0" />)}
        </span>
        <span className="absolute inset-0 overflow-hidden text-yellow-500" style={{ width: `${pct}%` }}>
          <span className="flex" style={{ width: size * 5 }}>
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} className="shrink-0" fill="currentColor" />)}
          </span>
        </span>
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{rating.value.toFixed(2)}</span>
      {rating.needsCheck && (
        <TriangleAlert data-testid="rating-check" size={size - 2} className="text-amber-500" aria-label="low-confidence match" />
      )}
    </span>
  )
}
