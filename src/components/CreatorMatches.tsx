import { STORY_ROLES, type CreatorMatch } from '@/lib/komga/mapping'

const CHIP = 'inline-flex max-w-full flex-wrap items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] leading-[1.35]'

/** The active creator filter made visible per card: one chip per matched name,
 *  showing the roles that creator holds in *this* series. Story credits
 *  (writer/penciller/inker/colorist) get a solid chip; cover-only matches a
 *  dashed, dimmed one — so a variant-cover "noise" match like Fiona Staples on
 *  The Wicked + The Divine reads as intentional instead of confusing. */
export function CreatorMatches({ matches, className }: { matches: CreatorMatch[]; className?: string }) {
  if (matches.length === 0) return null
  return (
    <div className={`flex flex-wrap items-start gap-1 ${className ?? ''}`}>
      {matches.map((m) => {
        const story = m.roles.some((r) => STORY_ROLES.has(r))
        return (
          <span key={m.name}
            className={`${CHIP} ${story
              ? 'border border-primary/45 bg-primary/20'
              : 'border border-dashed border-border text-muted-foreground'}`}>
            <span aria-hidden
              className={`size-[5px] shrink-0 rounded-full ${story ? 'bg-foreground' : 'border border-muted-foreground'}`} />
            <span className="max-w-full truncate font-medium">{m.name}</span>
            <span className="min-w-[55%] flex-[1_1_auto] truncate text-muted-foreground">{m.roles.join(' · ')}</span>
          </span>
        )
      })}
    </div>
  )
}
