import { type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

/** App frame. Desktop: a 260px left rail (brand + facet rail) beside the main
 *  column. Mobile: a slim brand bar + main; the rail content lives in the one
 *  filter sheet rendered by the route, opened from the toolbar's Filters button. */
export function AppShell({ sidebar, children }: { sidebar?: ReactNode; children: ReactNode }) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
          <span className="font-bold">Komga</span>
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    )
  }
  return (
    <div className="grid h-screen grid-cols-[260px_1fr] overflow-hidden bg-background text-foreground">
      <aside className="flex h-full min-h-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-4 py-3 font-bold">Komga</div>
        {sidebar}
      </aside>
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
