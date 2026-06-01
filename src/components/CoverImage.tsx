import { useState } from 'react'
import { BookImage } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CoverImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div data-testid="cover-fallback" className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}>
        <BookImage className="size-1/3 opacity-40" />
      </div>
    )
  }
  return (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
      className={cn('size-full object-cover', className)} />
  )
}
