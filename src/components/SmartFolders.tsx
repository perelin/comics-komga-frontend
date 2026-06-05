import { type Filters } from '@/lib/komga/filters'
import { SMART_PRESETS, type SmartFolder, applySmartFolder, isSmartFolderActive } from '@/lib/library'

function NavHead({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{children}</div>
}

/** The three quick views. Each applies its read-status/sort signature, clears
 *  the other facets, and PRESERVES the active library scope (see spec D5). */
export function SmartFolders({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  return (
    <div className="px-2">
      <NavHead>Smart folders</NavHead>
      {(Object.keys(SMART_PRESETS) as SmartFolder[]).map((k) => {
        const p = SMART_PRESETS[k]
        const Icon = p.icon
        const active = isSmartFolderActive(p.filters, filters)
        return (
          <button type="button" key={k} aria-pressed={active}
            onClick={() => onChange(applySmartFolder(p.filters, filters))}
            className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
            <Icon className="size-4 shrink-0 opacity-80" />
            <span className="flex-1 truncate text-left">{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}
