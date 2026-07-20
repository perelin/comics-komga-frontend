# Series Detail: Metadata Enrichment + Ambient Hero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Series Detail page with a book-1 summary fallback, full credits, link pills, a stat-block metadata band, and a progressive-blur cover backdrop — read-only, per the approved spec `docs/superpowers/specs/2026-07-20-series-detail-metadata-design.md`.

**Architecture:** All new display data already arrives in the `KomgaSeriesDto` + `useSeriesBooks` responses the page fetches today — no new endpoints. Pure logic goes into `src/lib/komga/` (TDD), presentation into two new components (`SeriesHero`, `SeriesMetaBand`) plus a `HeroBackdrop` layer component; `SeriesDetail.tsx` shrinks to layout + tabs.

**Tech Stack:** React 19 + TypeScript (strict, `verbatimModuleSyntax`), Vite, Tailwind v4 + shadcn, TanStack Query, vitest + @testing-library/react.

## Global Constraints

- **Strict TS:** use `import type { … }` for type-only imports (`verbatimModuleSyntax`); `noUnusedLocals`/`noUnusedParameters` are errors. `npm run build` (= `tsc -b && vite build`) typechecks **tests too**.
- **ESLint `react-refresh/only-export-components`:** component files (`src/components/*.tsx`, `src/routes/*.tsx`) must export components ONLY. Pure functions go in `src/lib/`, hooks in `src/hooks/`.
- **Dark-only app.** The page background token is `#09090b` (zinc-950). Hardcoding it inside the backdrop gradients is fine (matches spec).
- **Komga API is proxied:** all image/API URLs are relative `/komga/...` paths (dev proxy + prod reverse proxy inject the `X-API-Key`). Never build absolute URLs.
- **Do not remove** the localStorage shim in `src/test/setup.ts` (Node 26 workaround).
- Commands: `npm test` (vitest run), `npm run lint`, `npm run build`. Single file: `npx vitest run <path>`.
- Commit after every green task. Trailer:

  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  ```

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/komga/types.ts` (modify) | add `summary`/`summaryNumber` to `KomgaBooksMetadata` |
| `src/lib/komga/mapping.ts` (modify) | `pickSummary`, `creditNames`, `formatCredit` (pure) |
| `src/lib/komga/books.ts` (modify) | `bookPageUrl`, `yearRange`, `formatIndicator` (pure) |
| `src/hooks/useImageLoaded.ts` (create) | lazy `new Image()` preload hook |
| `src/components/HeroBackdrop.tsx` (create) | 4-layer progressive-blur backdrop + shade |
| `src/components/SeriesHero.tsx` (create) | hero (extracted from SeriesDetail) + summary/links/byline |
| `src/components/SeriesMetaBand.tsx` (create) | stat blocks + tag chips |
| `src/routes/SeriesDetail.tsx` (modify) | slims to top bar + hero + band + tabs |
| `src/index.css` (modify) | two `hero-text-shadow` utility classes |

---

### Task 1: DTO extension + `pickSummary` (summary fallback)

**Files:**
- Modify: `src/lib/komga/types.ts:22-26` (`KomgaBooksMetadata`)
- Modify: `src/lib/komga/mapping.ts`
- Test: `src/lib/komga/mapping.test.ts`

**Interfaces:**
- Consumes: existing `KomgaSeriesDto`.
- Produces: `KomgaBooksMetadata` gains `summary: string; summaryNumber: string`. New export from `mapping.ts`:
  ```ts
  export interface SummaryPick { text: string; fromBook: string | null }
  export function pickSummary(dto: KomgaSeriesDto): SummaryPick | null
  ```
  `fromBook` is the book number whose summary was borrowed (`booksMetadata.summaryNumber`), `null` when the series has its own summary.

- [ ] **Step 1: Extend the DTO type**

In `src/lib/komga/types.ts` replace the `KomgaBooksMetadata` interface with:

```ts
export interface KomgaBooksMetadata {
  authors: KomgaAuthor[]
  releaseDate: string | null
  tags: string[]
  /** Komga's fallback summary: the summary of the first book that has one… */
  summary: string
  /** …and that book's number (e.g. "1"). Empty strings when no book has a summary. */
  summaryNumber: string
}
```

- [ ] **Step 2: Fix fixture fallout**

Run: `npm run build`
Expected: type errors in test fixtures that construct `booksMetadata` literals. Known locations: `src/lib/komga/mapping.test.ts`, `src/lib/komga/queries.test.ts`, `src/lib/komga/filters.test.ts`, `src/lib/komga/mutations.test.tsx`, `src/lib/komga/read-progress.test.ts`, `src/routes/SeriesDetail.test.tsx`. Add `summary: '', summaryNumber: ''` to each `booksMetadata: { … }` literal. Re-run `npm run build` until clean.

- [ ] **Step 3: Write failing tests for `pickSummary`**

Append to `src/lib/komga/mapping.test.ts` (reuse the file's existing `dto` fixture — it is a full `KomgaSeriesDto`):

```ts
import { pickSummary } from './mapping'   // merge into the existing import

describe('pickSummary', () => {
  it('prefers the series summary and reports no source book', () => {
    const d = { ...dto, metadata: { ...dto.metadata, summary: 'Series own.' } }
    expect(pickSummary(d)).toEqual({ text: 'Series own.', fromBook: null })
  })

  it('falls back to the book summary with its number', () => {
    const d = {
      ...dto,
      metadata: { ...dto.metadata, summary: '' },
      booksMetadata: { ...dto.booksMetadata, summary: 'From book one.', summaryNumber: '1' },
    }
    expect(pickSummary(d)).toEqual({ text: 'From book one.', fromBook: '1' })
  })

  it('returns null when neither series nor books have a summary', () => {
    const d = {
      ...dto,
      metadata: { ...dto.metadata, summary: '' },
      booksMetadata: { ...dto.booksMetadata, summary: '', summaryNumber: '' },
    }
    expect(pickSummary(d)).toBeNull()
  })
})
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/lib/komga/mapping.test.ts`
Expected: FAIL — `pickSummary` is not exported.

- [ ] **Step 5: Implement `pickSummary`**

Append to `src/lib/komga/mapping.ts`:

```ts
export interface SummaryPick { text: string; fromBook: string | null }

/** The summary to show on Series Detail: the series' own, else Komga's
 *  first-book fallback (with the source book's number for the label). */
export function pickSummary(dto: KomgaSeriesDto): SummaryPick | null {
  if (dto.metadata.summary) return { text: dto.metadata.summary, fromBook: null }
  const bm = dto.booksMetadata
  if (bm.summary) return { text: bm.summary, fromBook: bm.summaryNumber || null }
  return null
}
```

- [ ] **Step 6: Verify green + full suite**

Run: `npx vitest run src/lib/komga/mapping.test.ts` → PASS. Then `npm test` → all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/komga/types.ts src/lib/komga/mapping.ts src/lib/komga/*.test.ts src/lib/komga/mutations.test.tsx src/routes/SeriesDetail.test.tsx
git commit -m "feat(detail): summary fallback picker + booksMetadata summary fields"
```

---

### Task 2: Credit helpers (`creditNames`, `formatCredit`)

**Files:**
- Modify: `src/lib/komga/mapping.ts`
- Test: `src/lib/komga/mapping.test.ts`

**Interfaces:**
- Consumes: `KomgaAuthor { name, role }` from `./types`.
- Produces:
  ```ts
  export function creditNames(authors: KomgaAuthor[], role: string): string[]
  export function formatCredit(names: string[], max?: number): string | null  // max defaults to 2
  ```
  `formatCredit([])` → `null`; `['A','B','C']` → `"A, B +1"`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/komga/mapping.test.ts`:

```ts
import { creditNames, formatCredit } from './mapping'   // merge into the existing import

describe('creditNames / formatCredit', () => {
  const authors = [
    { name: 'Alan Moore', role: 'writer' },
    { name: 'Jacen Burrows', role: 'penciller' },
    { name: 'Mark Seifert', role: 'editor' },
    { name: 'William Christensen', role: 'editor' },
  ]
  it('collects the names of one role in order', () => {
    expect(creditNames(authors, 'editor')).toEqual(['Mark Seifert', 'William Christensen'])
    expect(creditNames(authors, 'inker')).toEqual([])
  })
  it('formats up to max names, then +N', () => {
    expect(formatCredit(['A'])).toBe('A')
    expect(formatCredit(['A', 'B'])).toBe('A, B')
    expect(formatCredit(['A', 'B', 'C'])).toBe('A, B +1')
    expect(formatCredit(['A', 'B', 'C'], 1)).toBe('A +2')
  })
  it('returns null for no names', () => {
    expect(formatCredit([])).toBeNull()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/lib/komga/mapping.test.ts` → FAIL (not exported).

- [ ] **Step 3: Implement**

Append to `src/lib/komga/mapping.ts`:

```ts
/** All author names credited with a given role, in DTO order. */
export function creditNames(authors: KomgaAuthor[], role: string): string[] {
  return authors.filter((a) => a.role === role).map((a) => a.name)
}

/** "A", "A, B" or "A, B +1" — at most `max` names, the rest collapsed. */
export function formatCredit(names: string[], max = 2): string | null {
  if (names.length === 0) return null
  const shown = names.slice(0, max).join(', ')
  const extra = names.length - max
  return extra > 0 ? `${shown} +${extra}` : shown
}
```

- [ ] **Step 4: Verify green, commit**

Run: `npx vitest run src/lib/komga/mapping.test.ts` → PASS.

```bash
git add src/lib/komga/mapping.ts src/lib/komga/mapping.test.ts
git commit -m "feat(detail): credit extraction helpers (creditNames/formatCredit)"
```

---

### Task 3: `bookPageUrl`, `yearRange`, `formatIndicator`

**Files:**
- Modify: `src/lib/komga/books.ts`
- Test: `src/lib/komga/books.test.ts`

**Interfaces:**
- Consumes: `KomgaBookDto`, existing `releaseYear`, existing `sumPages`.
- Produces:
  ```ts
  export function bookPageUrl(id: string, page: number): string      // "/komga/api/v1/books/b1/pages/1"
  export function yearRange(books: KomgaBookDto[]): string | null    // "2010–2011" (en dash), "2010", or null
  export function formatIndicator(totalPages: number, booksCount: number): string | null
  // "4 issues · ⌀ 28 p. · Floppies" | "1 volume · 111 p. · TPB" | "2 volumes · ⌀ 600 p. · Omnibus" | null
  ```
  Thresholds (avg pages/book): `< 48` → Floppies (noun "issue/issues"), `48–249` → TPB, `≥ 250` → Omnibus (noun "volume/volumes"). Multi-book shows `⌀ {avg} p.`, single book shows `{total} p.`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/komga/books.test.ts` (the file already has a `book(n, progress, pages)` factory; extend it with a release-date override where needed by spreading):

```ts
import { bookPageUrl, yearRange, formatIndicator } from './books'   // merge into the existing import

describe('bookPageUrl', () => {
  it('builds the proxied full-page URL', () => {
    expect(bookPageUrl('b1', 1)).toBe('/komga/api/v1/books/b1/pages/1')
  })
})

describe('yearRange', () => {
  const at = (n: number, date: string | null) => {
    const b = book(n, null)
    return { ...b, metadata: { ...b.metadata, releaseDate: date } }
  }
  it('spans min–max with an en dash', () => {
    expect(yearRange([at(1, '2010-08-01'), at(2, '2011-02-01'), at(3, '2010-11-01')])).toBe('2010–2011')
  })
  it('collapses a single year', () => {
    expect(yearRange([at(1, '2010-08-01'), at(2, '2010-11-01')])).toBe('2010')
  })
  it('ignores dateless books; null when none have dates', () => {
    expect(yearRange([at(1, null), at(2, '2010-11-01')])).toBe('2010')
    expect(yearRange([at(1, null)])).toBeNull()
    expect(yearRange([])).toBeNull()
  })
})

describe('formatIndicator', () => {
  it('classifies floppies by average pages', () => {
    expect(formatIndicator(111, 4)).toBe('4 issues · ⌀ 28 p. · Floppies')
  })
  it('classifies a single TPB with its absolute page count', () => {
    expect(formatIndicator(180, 1)).toBe('1 volume · 180 p. · TPB')
  })
  it('classifies omnibi', () => {
    expect(formatIndicator(1200, 2)).toBe('2 volumes · ⌀ 600 p. · Omnibus')
  })
  it('is null without books or pages', () => {
    expect(formatIndicator(0, 0)).toBeNull()
    expect(formatIndicator(0, 3)).toBeNull()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/lib/komga/books.test.ts` → FAIL (not exported).

- [ ] **Step 3: Implement**

Append to `src/lib/komga/books.ts`:

```ts
/** A single full-resolution page image, served through the /komga proxy
 *  (like {@link bookCoverUrl}). Page numbers are 1-based. */
export function bookPageUrl(id: string, page: number): string {
  return `/komga/api/v1/books/${id}/pages/${page}`
}

/** Release-year span across a series' books: "2010–2011", "2010", or null. */
export function yearRange(books: KomgaBookDto[]): string | null {
  const years = books
    .map((b) => releaseYear(b.metadata.releaseDate))
    .filter((y): y is string => y !== null)
  if (years.length === 0) return null
  const min = years.reduce((a, b) => (b < a ? b : a))
  const max = years.reduce((a, b) => (b > a ? b : a))
  return min === max ? min : `${min}–${max}`
}

/** Physical-format guess from average pages/book: "4 issues · ⌀ 28 p. · Floppies". */
export function formatIndicator(totalPages: number, booksCount: number): string | null {
  if (booksCount === 0 || totalPages === 0) return null
  const avg = Math.round(totalPages / booksCount)
  const kind = avg < 48 ? 'Floppies' : avg < 250 ? 'TPB' : 'Omnibus'
  const noun = (kind === 'Floppies' ? 'issue' : 'volume') + (booksCount === 1 ? '' : 's')
  const pages = booksCount > 1 ? `⌀ ${avg} p.` : `${totalPages} p.`
  return `${booksCount} ${noun} · ${pages} · ${kind}`
}
```

- [ ] **Step 4: Verify green, commit**

Run: `npx vitest run src/lib/komga/books.test.ts` → PASS.

```bash
git add src/lib/komga/books.ts src/lib/komga/books.test.ts
git commit -m "feat(detail): bookPageUrl, yearRange and format indicator helpers"
```

---

### Task 4: `useImageLoaded` hook + `HeroBackdrop` component

**Files:**
- Create: `src/hooks/useImageLoaded.ts`
- Create: `src/components/HeroBackdrop.tsx`
- Modify: `src/index.css` (two text-shadow utilities, used by Task 5)
- Test: `src/components/HeroBackdrop.test.tsx`

**Interfaces:**
- Consumes: nothing project-specific.
- Produces:
  ```ts
  export function useImageLoaded(url: string | null): boolean      // hooks/useImageLoaded
  export function HeroBackdrop(props: { thumbUrl: string; hdUrl: string | null }): JSX.Element
  ```
  `HeroBackdrop` is `aria-hidden`, absolutely positioned (`absolute inset-0`); the parent must be `relative overflow-hidden`. Blur base renders immediately from `thumbUrl`; the three sharp(er) layers render from `hdUrl` and fade in once the browser has the image (`data-testid="backdrop-hd"` carries the opacity class).

- [ ] **Step 1: Write the failing tests**

Create `src/components/HeroBackdrop.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { HeroBackdrop } from './HeroBackdrop'

/** Controllable Image stub: capture instances, fire load manually. */
class FakeImage {
  static instances: FakeImage[] = []
  onload: (() => void) | null = null
  src = ''
  constructor() { FakeImage.instances.push(this) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeImage.instances = []
})

describe('HeroBackdrop', () => {
  it('renders only the blur base when there is no HD url', () => {
    render(<HeroBackdrop thumbUrl="/thumb.jpg" hdUrl={null} />)
    expect(screen.queryByTestId('backdrop-hd')).not.toBeInTheDocument()
  })

  it('keeps the HD layers invisible until the image loads, then fades them in', () => {
    vi.stubGlobal('Image', FakeImage)
    render(<HeroBackdrop thumbUrl="/thumb.jpg" hdUrl="/hd.jpg" />)
    const hd = screen.getByTestId('backdrop-hd')
    expect(hd.className).toContain('opacity-0')
    expect(FakeImage.instances[0].src).toBe('/hd.jpg')
    act(() => FakeImage.instances[0].onload?.())
    expect(hd.className).toContain('opacity-100')
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/components/HeroBackdrop.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useImageLoaded.ts`:

```ts
import { useEffect, useState } from 'react'

/** True once the browser has fully loaded `url` (via an off-DOM Image),
 *  false while loading or when url is null. Resets when url changes. */
export function useImageLoaded(url: string | null): boolean {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setLoaded(false)
    if (!url) return
    const img = new Image()
    img.onload = () => setLoaded(true)
    img.src = url
    return () => { img.onload = null }
  }, [url])
  return loaded
}
```

- [ ] **Step 4: Implement the component**

Create `src/components/HeroBackdrop.tsx`. Spec values (V7): layers blur 56/28/12/0 px; masks stretch the sharp→blur transition across the width; shade keeps the left readable and fades into the page background at the bottom.

```tsx
import type { CSSProperties } from 'react'
import { useImageLoaded } from '@/hooks/useImageLoaded'

const layer = (url: string): CSSProperties => ({
  position: 'absolute',
  inset: -60,
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center 22%',
})

const mask = (m: string): CSSProperties => ({ WebkitMaskImage: m, maskImage: m })

const MASK_28 = 'linear-gradient(to right, transparent 8%, #000 60%)'
const MASK_12 = 'linear-gradient(to right, transparent 30%, #000 80%)'
const MASK_0 = 'linear-gradient(to right, transparent 52%, #000 98%)'

const SHADE =
  'linear-gradient(to right, rgba(9,9,11,.55), rgba(9,9,11,.22) 50%, rgba(9,9,11,.05)), ' +
  'linear-gradient(to bottom, rgba(9,9,11,0) 45%, #09090b 97%)'

/** Ambient hero backdrop: the cover artwork, sharp on the right, dissolving
 *  into blur toward the left (progressive blur, 4 stacked layers). The blur
 *  base uses the cached series thumbnail and shows immediately; the sharp
 *  layers use the full page-1 scan and fade in once loaded. */
export function HeroBackdrop({ thumbUrl, hdUrl }: { thumbUrl: string; hdUrl: string | null }) {
  const hdLoaded = useImageLoaded(hdUrl)
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div style={{ ...layer(thumbUrl), filter: 'blur(56px) saturate(1.25)', opacity: 0.62 }} />
      {hdUrl && (
        <div
          data-testid="backdrop-hd"
          className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${hdLoaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <div style={{ ...layer(hdUrl), ...mask(MASK_28), filter: 'blur(28px) saturate(1.2)', opacity: 0.75 }} />
          <div style={{ ...layer(hdUrl), ...mask(MASK_12), filter: 'blur(12px) saturate(1.15)', opacity: 0.75 }} />
          <div style={{ ...layer(hdUrl), ...mask(MASK_0), filter: 'saturate(1.1)', opacity: 0.75 }} />
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: SHADE }} />
    </div>
  )
}
```

- [ ] **Step 5: Add the text-shadow utilities**

Append to the end of `src/index.css`:

```css
/* Readability on top of the hero artwork backdrop (HeroBackdrop). */
.hero-text-shadow { text-shadow: 0 1px 10px rgba(0, 0, 0, .85); }
.hero-text-shadow-strong { text-shadow: 0 2px 14px rgba(0, 0, 0, .85), 0 0 4px rgba(0, 0, 0, .6); }
```

- [ ] **Step 6: Verify green, commit**

Run: `npx vitest run src/components/HeroBackdrop.test.tsx` → PASS. `npm run lint` → clean (hook lives in `src/hooks/`, so `only-export-components` is satisfied).

```bash
git add src/hooks/useImageLoaded.ts src/components/HeroBackdrop.tsx src/components/HeroBackdrop.test.tsx src/index.css
git commit -m "feat(detail): progressive-blur hero backdrop with lazy HD layer"
```

---

### Task 5: `SeriesHero` component (extraction + summary/links/byline)

**Files:**
- Create: `src/components/SeriesHero.tsx`
- Test: `src/components/SeriesHero.test.tsx`
- (SeriesDetail.tsx is rewired in Task 7 — do NOT touch it here.)

**Interfaces:**
- Consumes: `mapSeries`, `pickSummary` (Task 1), `pickContinueBook`, `sumPages`, `yearRange` (Task 3), `bookPageUrl` (Task 3), `komgaReaderUrl`, `facetHref`, `useMarkSeries`, `AddToReadListButton`, `HeroBackdrop` (Task 4), `CoverImage`, `Stars`, `StatusDot`, `Badge`.
- Produces: `export function SeriesHero(props: { dto: KomgaSeriesDto; books: KomgaBookDto[] }): JSX.Element` — the complete hero section (backdrop + cover + title/byline/rating/links/summary/genres/actions). No breadcrumb, no tabs.

The JSX below is the **current hero from `src/routes/SeriesDetail.tsx:96-184` restructured** — keep all quoted class names; changes vs. today are: backdrop added, Goodreads link generalized to a links-pill row, byline gains year-range + total pages, summary block gains fallback + label + clamp toggle, action buttons get translucent backgrounds, text gets hero-text-shadow classes.

- [ ] **Step 1: Write the failing tests**

Create `src/components/SeriesHero.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SeriesHero } from './SeriesHero'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

const { markSeriesMutate } = vi.hoisted(() => ({ markSeriesMutate: vi.fn() }))
vi.mock('@/lib/komga/mutations', () => ({
  useMarkSeries: () => ({ mutate: markSeriesMutate, isPending: false }),
  useAddToReadList: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/komga/queries', () => ({
  useReadLists: () => ({ data: [] }),
}))

beforeEach(() => vi.clearAllMocks())

const LONG = 'x'.repeat(400)

function dto(over: Partial<KomgaSeriesDto['metadata']> = {}, bmOver: Partial<KomgaSeriesDto['booksMetadata']> = {}): KomgaSeriesDto {
  return {
    id: 's1', libraryId: 'lib1', name: 'Neonomicon', oneshot: false,
    booksCount: 4, booksReadCount: 0, booksUnreadCount: 4, booksInProgressCount: 0,
    metadata: {
      status: 'ONGOING', title: "Alan Moore's Neonomicon", titleSort: 'Neonomicon',
      summary: '', publisher: 'Avatar Press', genres: [], tags: ['rating:3.45'],
      links: [{ label: '★ 3.46 · Goodreads (7.2k)', url: 'https://gr.example/x' }],
      ageRating: null, language: '', readingDirection: '', totalBookCount: 4,
      ...over,
    },
    booksMetadata: {
      authors: [{ name: 'Alan Moore', role: 'writer' }, { name: 'Jacen Burrows', role: 'penciller' }],
      releaseDate: '2010-08-01', tags: [], summary: LONG, summaryNumber: '1',
      ...bmOver,
    },
    created: '', lastModified: '',
  }
}

function book(n: number, pages: number, date: string): KomgaBookDto {
  return {
    id: `b${n}`, seriesId: 's1', seriesTitle: 'Neonomicon', name: `Vol ${n}`,
    media: { pagesCount: pages },
    metadata: { title: `Part ${n}`, number: String(n), numberSort: n, releaseDate: date, summary: '' },
    readProgress: null,
  }
}
const books = [book(1, 27, '2010-08-01'), book(2, 30, '2010-10-01'), book(3, 27, '2010-12-01'), book(4, 27, '2011-02-01')]

function renderHero(d = dto(), b = books) {
  return render(<MemoryRouter><SeriesHero dto={d} books={b} /></MemoryRouter>)
}

describe('SeriesHero', () => {
  it('shows the fallback summary with its source-book label', () => {
    renderHero()
    expect(screen.getByText('Summary · from Vol. 1')).toBeInTheDocument()
  })

  it('labels a series-own summary plainly and expands on Read more', () => {
    renderHero(dto({ summary: LONG }))
    expect(screen.getByText('Summary')).toBeInTheDocument()
    const p = screen.getByText(LONG)
    expect(p.className).toContain('line-clamp-4')
    fireEvent.click(screen.getByRole('button', { name: /read more/i }))
    expect(p.className).not.toContain('line-clamp-4')
  })

  it('renders no summary block when there is nothing to show', () => {
    renderHero(dto({}, { summary: '', summaryNumber: '' }))
    expect(screen.queryByText(/^Summary/)).not.toBeInTheDocument()
  })

  it('renders every metadata link as an external pill', () => {
    renderHero()
    const pill = screen.getByRole('link', { name: /Goodreads \(7\.2k\)/ })
    expect(pill).toHaveAttribute('href', 'https://gr.example/x')
    expect(pill).toHaveAttribute('target', '_blank')
  })

  it('byline shows the year range and the summed pages', () => {
    renderHero()
    expect(screen.getByText(/2010–2011/)).toBeInTheDocument()
    expect(screen.getByText(/111 pages/)).toBeInTheDocument()
  })

  it('keeps the mark-all-read action working', () => {
    renderHero()
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))
    expect(markSeriesMutate).toHaveBeenCalledWith({ seriesId: 's1', read: true })
  })
})
```

Note: if `AddToReadListButton` needs further query/mutation mocks to render, check `src/components/AddToReadListButton.test.tsx` for its dependency surface and extend the two `vi.mock` blocks accordingly (mock what its own test file mocks).

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/components/SeriesHero.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement `SeriesHero`**

Create `src/components/SeriesHero.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Play, Check, CheckCheck, RotateCcw } from 'lucide-react'
import { useMarkSeries } from '@/lib/komga/mutations'
import { AddToReadListButton } from '@/components/AddToReadListButton'
import { mapSeries, pickSummary } from '@/lib/komga/mapping'
import { pickContinueBook, sumPages, yearRange, bookPageUrl } from '@/lib/komga/books'
import { komgaReaderUrl } from '@/lib/komga/reader'
import { facetHref } from '@/lib/komga/filters'
import { CoverImage } from '@/components/CoverImage'
import { HeroBackdrop } from '@/components/HeroBackdrop'
import { Stars } from '@/components/Stars'
import { StatusDot } from '@/components/StatusDot'
import { Badge } from '@/components/ui/badge'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

/** Show the Read-more toggle only when the text plausibly overflows 4 clamped lines. */
const CLAMP_THRESHOLD = 280

export function SeriesHero({ dto, books }: { dto: KomgaSeriesDto; books: KomgaBookDto[] }) {
  const s = mapSeries(dto)
  const markSeries = useMarkSeries()
  const [expanded, setExpanded] = useState(false)
  const cont = pickContinueBook(books)
  const done = s.progress.total > 0 && s.progress.read >= s.progress.total
  const years = yearRange(books)
  const pages = sumPages(books)
  const summary = pickSummary(dto)
  const hdUrl = books.length > 0 ? bookPageUrl(books[0].id, 1) : null

  return (
    <div className="relative">
      {/* Spec: no books → no backdrop at all (page looks like today). */}
      {books.length > 0 && <HeroBackdrop thumbUrl={s.coverUrl} hdUrl={hdUrl} />}
      <div className="relative flex gap-4 p-4 md:gap-7 md:p-6">
        <div className="w-28 shrink-0 md:w-48">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border shadow-xl">
            <CoverImage src={s.coverUrl} alt={s.title} />
          </div>
          <div className="mt-2.5 text-center text-xs tabular-nums text-muted-foreground hero-text-shadow">
            {s.progress.total} volume{s.progress.total === 1 ? '' : 's'} · {s.progress.read} read
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight md:text-3xl hero-text-shadow-strong">{s.title}</h1>
            <StatusDot status={s.status} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground hero-text-shadow">
            {s.author && s.author !== '—' ? (
              <Link to={facetHref({ authors: [s.author] })} className="text-primary hover:underline">{s.author}</Link>
            ) : (
              <span className="text-primary">{s.author}</span>
            )}
            <span className="text-muted-foreground/50">·</span>
            {s.publisher && s.publisher !== '—' ? (
              <Link to={facetHref({ publisher: [s.publisher] })} className="hover:text-foreground hover:underline">{s.publisher}</Link>
            ) : (
              <span>{s.publisher}</span>
            )}
            {years && (<><span className="text-muted-foreground/50">·</span><span className="tabular-nums">{years}</span></>)}
            {pages > 0 && (<><span className="text-muted-foreground/50">·</span><span className="tabular-nums">{pages.toLocaleString('en-US')} pages</span></>)}
            {s.language && (<><span className="text-muted-foreground/50">·</span><span className="uppercase">{s.language}</span></>)}
          </div>

          {s.rating && (
            <div className="mt-3.5 flex items-center gap-3">
              <Stars rating={s.rating} size={18} />
            </div>
          )}

          {dto.metadata.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dto.metadata.links.map((l) => (
                <a
                  key={l.url} href={l.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-foreground/25 bg-background/50 px-3 py-1 text-xs font-medium text-foreground hover:bg-background/70"
                >
                  {l.label} <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          )}

          {s.genres.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {s.genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
            </div>
          )}

          {summary && (
            <div className="mt-3.5 max-w-2xl">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground hero-text-shadow">
                Summary{summary.fromBook ? ` · from Vol. ${summary.fromBook}` : ''}
              </div>
              <p className={`mt-1 text-sm leading-relaxed text-foreground/95 hero-text-shadow ${expanded ? '' : 'line-clamp-4'}`}>
                {summary.text}
              </p>
              {summary.text.length > CLAMP_THRESHOLD && (
                <button
                  type="button" onClick={() => setExpanded((e) => !e)}
                  className="mt-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? 'Show less ▴' : 'Read more ▾'}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5 md:mt-5">
            {cont ? (
              <a href={komgaReaderUrl(cont.book.id)} target="_blank" rel="noreferrer"
                 className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-primary-foreground hover:bg-primary/90">
                <Play className="size-4" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{cont.started ? 'Continue reading' : 'Start reading'}</span>
                  <span className="text-[11px] tabular-nums opacity-85">
                    Vol. {cont.book.metadata.number}{cont.started ? ` · p.${cont.page + 1}/${cont.pages}` : ''}
                  </span>
                </span>
              </a>
            ) : books.length > 0 ? (
              <a href={komgaReaderUrl(books[0].id)} target="_blank" rel="noreferrer"
                 className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/45 px-4 text-sm hover:bg-accent">
                <Check className="size-4 text-green-500" /> All read · re-read from Vol. {books[0].metadata.number}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => markSeries.mutate({ seriesId: dto.id, read: !done })}
              disabled={markSeries.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/45 px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {done ? <RotateCcw className="size-4" /> : <CheckCheck className="size-4" />}
              {done ? 'Mark all unread' : 'Mark all read'}
            </button>
            <AddToReadListButton
              target={{ type: 'series', seriesId: dto.id }}
              label="Zu Liste"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background/45 px-4 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

Note the deliberate change: the old inline Goodreads `<a>` next to the stars is **gone** — `metadata.links` renders it as a pill now (its label already contains "★ 3.46 · Goodreads (7.2k)").

- [ ] **Step 4: Verify green, commit**

Run: `npx vitest run src/components/SeriesHero.test.tsx` → PASS. `npm run lint` → clean.

```bash
git add src/components/SeriesHero.tsx src/components/SeriesHero.test.tsx
git commit -m "feat(detail): SeriesHero with backdrop, summary fallback and link pills"
```

---

### Task 6: `SeriesMetaBand` component (stat blocks + tag chips)

**Files:**
- Create: `src/components/SeriesMetaBand.tsx`
- Test: `src/components/SeriesMetaBand.test.tsx`

**Interfaces:**
- Consumes: `creditNames`/`formatCredit` (Task 2), `sumPages`, `formatIndicator` (Task 3), `facetHref`, `Badge`.
- Produces: `export function SeriesMetaBand(props: { dto: KomgaSeriesDto; books: KomgaBookDto[] }): JSX.Element | null` — renders `null` when there is nothing to show (no credits, no publisher, no format, no tags).

Blocks (skip empty ones): Writer (link→authors facet), Art (`penciller`, fallback `inker`; link→authors facet), Colors (`colorist`), Editor (`editor`, `formatCredit(names, 1)` → "Mark Seifert +1"), Publisher (link→publisher facet), Format (`formatIndicator`). Then one chip row: `metadata.tags ∪ booksMetadata.tags`, deduplicated, `rating:*` filtered, not clickable.

- [ ] **Step 1: Write the failing tests**

Create `src/components/SeriesMetaBand.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SeriesMetaBand } from './SeriesMetaBand'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

function dto(over: Partial<KomgaSeriesDto['metadata']> = {}, authors = [
  { name: 'Alan Moore', role: 'writer' },
  { name: 'Jacen Burrows', role: 'penciller' },
  { name: 'Juanmar', role: 'colorist' },
  { name: 'Mark Seifert', role: 'editor' },
  { name: 'William Christensen', role: 'editor' },
]): KomgaSeriesDto {
  return {
    id: 's1', libraryId: 'lib1', name: 'Neonomicon', oneshot: false,
    booksCount: 4, booksReadCount: 0, booksUnreadCount: 4, booksInProgressCount: 0,
    metadata: {
      status: 'ONGOING', title: 'Neonomicon', titleSort: 'Neonomicon', summary: '',
      publisher: 'Avatar Press', genres: [], tags: ['rating:3.45', 'variant cover'],
      links: [], ageRating: null, language: '', readingDirection: '', totalBookCount: 4,
      ...over,
    },
    booksMetadata: { authors, releaseDate: '2010-08-01', tags: ['sexual violence', 'variant cover'], summary: '', summaryNumber: '' },
    created: '', lastModified: '',
  }
}

function book(n: number, pages: number): KomgaBookDto {
  return {
    id: `b${n}`, seriesId: 's1', seriesTitle: 'Neonomicon', name: `Vol ${n}`,
    media: { pagesCount: pages },
    metadata: { title: `Part ${n}`, number: String(n), numberSort: n, releaseDate: '2010-08-01', summary: '' },
    readProgress: null,
  }
}
const books = [book(1, 27), book(2, 30), book(3, 27), book(4, 27)]

const renderBand = (d = dto(), b = books) =>
  render(<MemoryRouter><SeriesMetaBand dto={d} books={b} /></MemoryRouter>)

describe('SeriesMetaBand', () => {
  it('renders credit blocks with role labels', () => {
    renderBand()
    expect(screen.getByText('Writer')).toBeInTheDocument()
    expect(screen.getByText('Alan Moore')).toBeInTheDocument()
    expect(screen.getByText('Art')).toBeInTheDocument()
    expect(screen.getByText('Jacen Burrows')).toBeInTheDocument()
    expect(screen.getByText('Colors')).toBeInTheDocument()
    expect(screen.getByText('Mark Seifert +1')).toBeInTheDocument()
  })

  it('writer and publisher link to freshly-scoped filtered lists', () => {
    renderBand()
    expect(screen.getByRole('link', { name: 'Alan Moore' })).toHaveAttribute('href', expect.stringContaining('authors='))
    expect(screen.getByRole('link', { name: 'Avatar Press' })).toHaveAttribute('href', expect.stringContaining('publisher='))
  })

  it('derives the format block from the books', () => {
    renderBand()
    expect(screen.getByText('4 issues · ⌀ 28 p. · Floppies')).toBeInTheDocument()
  })

  it('omits empty blocks', () => {
    renderBand(dto({}, [{ name: 'Alan Moore', role: 'writer' }]))
    expect(screen.queryByText('Colors')).not.toBeInTheDocument()
    expect(screen.queryByText('Editor')).not.toBeInTheDocument()
  })

  it('merges + dedupes tags across series and books, hiding rating tags', () => {
    renderBand()
    expect(screen.getByText('variant cover')).toBeInTheDocument()
    expect(screen.getByText('sexual violence')).toBeInTheDocument()
    expect(screen.queryByText(/rating:/)).not.toBeInTheDocument()
    expect(screen.getAllByText('variant cover')).toHaveLength(1)
  })

  it('renders nothing at all when there is no data', () => {
    const empty = dto({ publisher: '', tags: [] }, [])
    empty.booksMetadata.tags = []
    const { container } = renderBand(empty, [])
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/components/SeriesMetaBand.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/components/SeriesMetaBand.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { creditNames, formatCredit } from '@/lib/komga/mapping'
import { sumPages, formatIndicator } from '@/lib/komga/books'
import { facetHref } from '@/lib/komga/filters'
import { Badge } from '@/components/ui/badge'
import type { KomgaBookDto, KomgaSeriesDto } from '@/lib/komga/types'

interface Block { label: string; value: string; href?: string }

/** Curated metadata band between the hero and the tabs: one row of stat
 *  blocks (credits, publisher, format) + one row of tag chips. The Metadata
 *  tab keeps the complete raw table; this is the readable subset. */
export function SeriesMetaBand({ dto, books }: { dto: KomgaSeriesDto; books: KomgaBookDto[] }) {
  const authors = dto.booksMetadata.authors
  const writers = creditNames(authors, 'writer')
  const art = creditNames(authors, 'penciller')
  const artNames = art.length > 0 ? art : creditNames(authors, 'inker')
  const colors = creditNames(authors, 'colorist')
  const editors = creditNames(authors, 'editor')
  const format = formatIndicator(sumPages(books), books.length)

  const blocks: Block[] = []
  const writer = formatCredit(writers)
  if (writer) blocks.push({ label: 'Writer', value: writer, href: facetHref({ authors: [writers[0]] }) })
  const artist = formatCredit(artNames)
  if (artist) blocks.push({ label: 'Art', value: artist, href: facetHref({ authors: [artNames[0]] }) })
  const colorist = formatCredit(colors)
  if (colorist) blocks.push({ label: 'Colors', value: colorist })
  const editor = formatCredit(editors, 1)
  if (editor) blocks.push({ label: 'Editor', value: editor })
  if (dto.metadata.publisher) {
    blocks.push({ label: 'Publisher', value: dto.metadata.publisher, href: facetHref({ publisher: [dto.metadata.publisher] }) })
  }
  if (format) blocks.push({ label: 'Format', value: format })

  const tags = [...new Set([...dto.metadata.tags, ...dto.booksMetadata.tags])]
    .filter((t) => !t.startsWith('rating:'))

  if (blocks.length === 0 && tags.length === 0) return null

  return (
    <div className="px-4 pb-5 md:px-6">
      {blocks.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
          {blocks.map((b) => (
            <div key={b.label} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.label}</div>
              <div className="mt-0.5 truncate text-sm font-medium" title={b.value}>
                {b.href ? (
                  <Link to={b.href} className="hover:underline">{b.value}</Link>
                ) : (
                  b.value
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify green, commit**

Run: `npx vitest run src/components/SeriesMetaBand.test.tsx` → PASS.

```bash
git add src/components/SeriesMetaBand.tsx src/components/SeriesMetaBand.test.tsx
git commit -m "feat(detail): SeriesMetaBand stat blocks + tag chips"
```

---

### Task 7: Wire into `SeriesDetail`, full verification, docs

**Files:**
- Modify: `src/routes/SeriesDetail.tsx` (hero block `96-184` → components; imports slim down)
- Modify: `src/routes/SeriesDetail.test.tsx` (fixtures already fixed in Task 1; assertions should still pass)
- Modify: `README.md`, `HANDOVER.md`

**Interfaces:**
- Consumes: `SeriesHero` (Task 5), `SeriesMetaBand` (Task 6).
- Produces: the final page layout: top bar → `SeriesHero` → `SeriesMetaBand` → tabs (unchanged).

- [ ] **Step 1: Rewire the page**

In `src/routes/SeriesDetail.tsx`:

1. Replace the whole hero `<div className="flex gap-4 p-4 md:gap-7 md:p-6"> … </div>` block (currently lines 96–184) with:

```tsx
        <SeriesHero dto={dto} books={books} />
        <SeriesMetaBand dto={dto} books={books} />
```

2. Add imports:

```tsx
import { SeriesHero } from '@/components/SeriesHero'
import { SeriesMetaBand } from '@/components/SeriesMetaBand'
```

3. Remove now-unused code from `SeriesDetail.tsx` (strict TS makes these errors, the compiler will list them): the `mapSeries`, `pickContinueBook`, `komgaReaderUrl`, `facetHref`, `CoverImage`, `Stars`, `Badge`, `AddToReadListButton`, `useMarkSeries` imports **if** no longer referenced (the tabs still use several — follow the compiler, not this list), the `s`/`cont`/`done` locals, and the `year` local **if** only the deleted hero used it (the `MetadataTab` still takes `year` — keep `releaseYear` for it).

- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: all green — the existing `SeriesDetail.test.tsx` assertions (hero title/author/publisher, mark-all-read, facet links) now exercise the extracted `SeriesHero` through the page. If a test fails on a changed accessible name or duplicate text (e.g. publisher now appears in hero **and** band), prefer tightening the query (`getAllByText`/`within`) over changing the UI.

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: both clean.

- [ ] **Step 4: Visual smoke test**

Run: `npm run dev` and open `http://localhost:5173/series/0QS70B4C7CEQC` (Neonomicon, 4 books — exercises fallback summary, credits, links, floppies format). Verify: backdrop visible & sharp on the right, blurring left; summary labeled "Summary · from Vol. 1" with Read more; Goodreads pill; stat blocks row; tag chips. Also open a series **without** books/summary to confirm graceful degradation. Screenshot via Playwright CLI if available (`npx playwright screenshot --viewport-size=1400,900 <url> shot.png`) — the page needs the dev proxy, so screenshot against the dev server, not a static build.

- [ ] **Step 5: Update docs**

- `README.md`: in the feature list, extend the Series Detail bullet: summary with book-1 fallback, full credits + format stat band, link pills, ambient progressive-blur cover backdrop.
- `HANDOVER.md`: in the architecture notes add one bullet: Series Detail hero lives in `SeriesHero.tsx` + `HeroBackdrop.tsx` (progressive blur: thumbnail base + lazy full page-1 HD layers via `bookPageUrl`), curated band in `SeriesMetaBand.tsx`; pure helpers `pickSummary`/`creditNames`/`formatCredit` (mapping.ts) and `yearRange`/`formatIndicator`/`bookPageUrl` (books.ts).

- [ ] **Step 6: Commit**

```bash
git add src/routes/SeriesDetail.tsx src/routes/SeriesDetail.test.tsx README.md HANDOVER.md
git commit -m "feat(detail): wire SeriesHero + SeriesMetaBand into the page"
```

---

## Out of scope (do not build)

- Inline edits: rating (P2L-156), tags/summary (P2L-157).
- Tag chips are **not** clickable (no tag facet exists in the Library Browser yet).
- No change to the Library Browser default view (already `grid`).
- No change to the Metadata tab (stays as the complete raw table).
