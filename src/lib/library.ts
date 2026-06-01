import { Clock, Sparkles, BookOpen } from 'lucide-react'
import { DEFAULT_FILTERS, type Filters } from '@/lib/komga/filters'

export function prettyLibraryName(name: string): string {
  const m = /^xCat:[A-Za-z]+\s+(.*)$/.exec(name)
  return m ? m[1].trim() : name
}

export type SmartFolder = 'continue' | 'recent' | 'unread'
export const SMART_PRESETS: Record<SmartFolder, { label: string; icon: typeof Clock; filters: Filters }> = {
  continue: { label: 'Continue reading', icon: Clock, filters: { ...DEFAULT_FILTERS, readStatus: ['IN_PROGRESS'] } },
  recent: { label: 'Recently added', icon: Sparkles, filters: { ...DEFAULT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' } },
  unread: { label: 'Unread', icon: BookOpen, filters: { ...DEFAULT_FILTERS, readStatus: ['UNREAD'] } },
}
