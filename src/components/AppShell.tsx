import type { ReactNode } from 'react'

export function AppShell({ sidebar, children }: { sidebar?: ReactNode; children: ReactNode }) {
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
