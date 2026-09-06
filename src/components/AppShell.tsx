import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, BookmarkPlus, LogOut } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

/** Top-level view switch in the rail: Library vs Read Lists. */
function NavLinks() {
  const { pathname } = useLocation()
  const onLists = pathname.startsWith('/readlists')
  const cls = (active: boolean) =>
    `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${active ? 'bg-secondary font-semibold' : 'text-foreground hover:bg-accent'}`
  return (
    <nav className="flex flex-col gap-0.5 px-2 pb-2">
      <Link to="/" className={cls(!onLists)}><LayoutGrid className="size-4" /> Library</Link>
      <Link to="/readlists" className={cls(onLists)}><BookmarkPlus className="size-4" /> Read Lists</Link>
    </nav>
  )
}

/** Full-page sign-out: the server clears the session cookie and redirects to
 *  /login. Deliberately a plain <a>, not a router Link — this leaves the SPA.
 *  (In dev there is no auth layer, so it just reloads the page.) */
function SignOut({ className }: { className?: string }) {
  return (
    <a
      href="/logout"
      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground ${className ?? ''}`}
    >
      <LogOut className="size-4" /> Sign out
    </a>
  )
}

/** App frame. Desktop: a 260px left rail (brand + nav + facet/list rail) beside the
 *  main column. Mobile: a slim brand bar (with a Read Lists shortcut) + main; the rail
 *  content lives in the one filter sheet rendered by the route. */
export function AppShell({ sidebar, children }: { sidebar?: ReactNode; children: ReactNode }) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
          <Link to="/" className="font-bold">Komga</Link>
          <div className="ml-auto flex items-center gap-3 text-muted-foreground">
            <Link to="/readlists" className="hover:text-foreground" aria-label="Read Lists"><BookmarkPlus className="size-5" /></Link>
            <a href="/logout" aria-label="Sign out" className="hover:text-foreground"><LogOut className="size-5" /></a>
          </div>
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    )
  }
  return (
    <div className="grid h-screen grid-cols-[260px_1fr] overflow-hidden bg-background text-foreground">
      <aside className="flex h-full min-h-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-4 py-3 font-bold">Komga</div>
        <NavLinks />
        {sidebar}
        <div className="shrink-0 border-t border-border px-2 py-2">
          <SignOut className="w-full" />
        </div>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
