import { useState } from 'react'
import { BookImage } from 'lucide-react'

export function CoverImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div data-testid="cover-fallback" className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ''}`}>
        <BookImage className="size-1/3 opacity-40" />
      </div>
    )
  }
  return (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
      className={`size-full object-cover ${className ?? ''}`} />
  )
}
