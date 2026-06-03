import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useIsMobile'

function MobileTopBar({ sidebar }: { sidebar?: ReactNode }) {
  const [open, setOpen] = useState(false)
  // Close the drawer when a nav item (a <button>) is tapped, but not when
  // interacting with the read-list filter <input> inside the sidebar.
  const closeOnNavClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) setOpen(false)
  }
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open navigation" />}>
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="gap-0 p-0">
          <SheetTitle className="px-4 py-3 font-bold">Komga</SheetTitle>
          <div className="flex min-h-0 flex-1 flex-col" onClick={closeOnNavClick}>
            {sidebar}
          </div>
        </SheetContent>
      </Sheet>
      <span className="font-bold">Komga</span>
    </div>
  )
}

export function AppShell({ sidebar, children }: { sidebar?: ReactNode; children: ReactNode }) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <MobileTopBar sidebar={sidebar} />
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
