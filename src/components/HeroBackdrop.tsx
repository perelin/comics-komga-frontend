import type { CSSProperties } from 'react'
import { useImageLoaded } from '@/hooks/useImageLoaded'

const layer = (url: string): CSSProperties => ({
  position: 'absolute',
  inset: -60,
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center 22%',
})

const mask = (m: string): CSSProperties => ({ WebkitMaskImage: m, maskImage: m })

const MASK_28 = 'linear-gradient(to right, transparent 8%, #000 60%)'
const MASK_12 = 'linear-gradient(to right, transparent 30%, #000 80%)'
const MASK_0 = 'linear-gradient(to right, transparent 52%, #000 98%)'

const SHADE =
  'linear-gradient(to right, rgba(9,9,11,.55), rgba(9,9,11,.22) 50%, rgba(9,9,11,.05)), ' +
  'linear-gradient(to bottom, rgba(9,9,11,0) 45%, #09090b 97%)'

/** Ambient hero backdrop: the cover artwork, sharp on the right, dissolving
 *  into blur toward the left (progressive blur, 4 stacked layers). The blur
 *  base uses the cached series thumbnail and shows immediately; the sharp
 *  layers use the full page-1 scan and fade in once loaded. */
export function HeroBackdrop({ thumbUrl, hdUrl }: { thumbUrl: string; hdUrl: string | null }) {
  const hdLoaded = useImageLoaded(hdUrl)
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div style={{ ...layer(thumbUrl), filter: 'blur(56px) saturate(1.25)', opacity: 0.62 }} />
      {hdUrl && (
        <div
          data-testid="backdrop-hd"
          className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${hdLoaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <div style={{ ...layer(hdUrl), ...mask(MASK_28), filter: 'blur(28px) saturate(1.2)', opacity: 0.75 }} />
          <div style={{ ...layer(hdUrl), ...mask(MASK_12), filter: 'blur(12px) saturate(1.15)', opacity: 0.75 }} />
          <div style={{ ...layer(hdUrl), ...mask(MASK_0), filter: 'saturate(1.1)', opacity: 0.75 }} />
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: SHADE }} />
    </div>
  )
}
