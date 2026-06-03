import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

/** True below the `md` (768px) breakpoint. Drives mobile-only *structural*
 *  rendering (nav drawer, filter sheet, suppressed hover actions, forced
 *  book-card view). Styling-only changes use Tailwind `md:` classes instead. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}
