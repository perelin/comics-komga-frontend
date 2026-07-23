import { useEffect, useState } from 'react'

/** True once the browser has fully loaded `url` (via an off-DOM Image),
 *  false while loading or when url is null. Resets when url changes. */
export function useImageLoaded(url: string | null): boolean {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on url change; the cascading re-render is intentional and cheap
    setLoaded(false)
    if (!url) return
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.onerror = () => setLoaded(false)
    img.src = url
    return () => { img.onload = null; img.onerror = null }
  }, [url])
  return loaded
}
