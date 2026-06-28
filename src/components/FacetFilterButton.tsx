import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/** A name (author/publisher) that filters the library list when clicked.
 *  Rendered as a <button> rather than a <Link> on purpose: the series cards and
 *  rows wrap their whole body in a <Link>, and a nested <a> is invalid HTML.
 *  preventDefault + stopPropagation swallow the click so the surrounding card
 *  link doesn't also navigate — the same idiom the card's quick-action buttons use. */
export function FacetFilterButton({ href, children, className }: {
  href: string
  children: ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(href) }}
      className={className}
    >
      {children}
    </button>
  )
}
