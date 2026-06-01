export interface Progress {
  read: number
  inProgress: number
  unread: number
  total: number
}

export function readPct(p: Progress): number {
  if (!p.total) return 0
  return Math.round(((p.read + p.inProgress * 0.5) / p.total) * 100)
}
