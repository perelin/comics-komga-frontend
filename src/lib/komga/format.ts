// The format:* tag convention written by comics-komga-ratings
// (docs/format-classifier-spec.md): every series carries at most one primary
// format tag, plus an optional `format:mixed` data-quality flag that rides
// alongside the primary — mirroring how `rating:check` rides on `rating:<bucket>`.
// Series without a primary tag (~12) are treated as "unknown": no badge, and
// they never match a format filter.

export type FormatKind = 'singles' | 'tpb' | 'omnibus' | 'oneshot' | 'ogn'

export interface Format {
  kind: FormatKind
  /** Data-quality flag: floppies and trades shelved in one series (cleanup candidate). */
  mixed: boolean
}

export const FORMAT_KINDS: FormatKind[] = ['singles', 'tpb', 'omnibus', 'oneshot', 'ogn']

/** Short display label per format kind (badges, chips, meta band). */
export const FORMAT_LABEL: Record<FormatKind, string> = {
  singles: 'Singles', tpb: 'TPB', omnibus: 'Omnibus', oneshot: 'One-shot', ogn: 'OGN',
}

export function isFormatKind(v: string): v is FormatKind {
  return (FORMAT_KINDS as string[]).includes(v)
}

/** The series' primary format from its tags; undefined when untagged.
 *  `format:mixed` alone never yields a Format — it's a flag, not a format. */
export function parseFormat(tags: string[]): Format | undefined {
  const mixed = tags.includes('format:mixed')
  for (const t of tags) {
    if (!t.startsWith('format:')) continue
    const kind = t.slice('format:'.length)
    if (isFormatKind(kind)) return { kind, mixed }
  }
  return undefined
}
