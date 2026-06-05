# HANDOVER — comics-komga-frontend

> For the next agent (or human) picking up this repo. Read this first, then
> `README.md` (user-facing) and `docs/design-spec.md` (original design intent).
> This file is **as-built** and authoritative where it differs from the spec.

## TL;DR

A power-user web frontend for the Komga comic server at `https://komga.p2lab.com`.
**Vertical slice 1 is complete, reviewed, and live-verified.** The **Library
Browser** is fully wired against the live API; **Series Detail** has been rebuilt
to the design-mock IA (read-only — see below); the **⌘K Command Palette** is
functional-but-shallow. Repo:
`git@github.com:perelin/comics-komga-frontend` (private). **Live in production at
https://comics.p2lab.com** — a `caddy:2-alpine` container on the Docker host
(CT 101) behind the edge Caddy, gated by HTTP basic-auth (user `perelin`; creds in
`pass services/comics/basic-auth`). Deploy details: `deploy/DEPLOY.md`. Also
runnable locally / on the LAN via `npm run dev`.

## Quick start

```bash
cp .env.example .env        # set KOMGA_BASE_URL + KOMGA_API_KEY (same values as
                            # the agents monorepo applications/komga/.env)
npm install
npm run dev                 # http://localhost:5173  (also LAN: see below)
npm test                    # 146 tests (Vitest)
npm run build               # tsc -b + vite build
npm run lint                # ESLint (see "Lint baseline" — 4 known non-issues)
```

**LAN access (already configured):** `vite.config.ts` sets `host: true`,
`port: 5173`, `strictPort: true`, `allowedHosts: true`, so the dev server is
reachable from other machines at **http://192.168.178.24:5173** or
**http://FreddieMercuryMacMini.local:5173**. The macOS firewall is off. The
`X-API-Key` is injected **server-side by the Vite proxy** and never reaches the
client machine. Nothing to install on the client — just a browser.

## What works (live-verified via headless smoke + curl)

- **Library Browser** — virtualized grid + list over all **1947 series**
  (TanStack Virtual; only the visible window renders), real covers /
  read-progress / ratings, live result count, debounced search-within, sort
  (Title / Recently added / Recently updated), multi-facet filters
  (read-status, library, status, genre, publisher, age-rating, one-shot). **All
  filter/sort/view state is in the URL** (deep-linkable + reload-safe).
- **Sidebar** — smart folders (Continue reading / Recently added / Unread),
  libraries (`xCat:` prefix stripped for display), read-list search.
- **Series Detail** (`/series/:id`) — rebuilt to the design-mock IA (read-only):
  breadcrumb + "Open in Komga"; hero (cover, "N volumes · M read", status,
  author·publisher·year·language, rating + Goodreads, genres, summary);
  **Continue/Start reading** deep-links into Komga's web reader (`/book/{id}/read`);
  **Books / Related / Metadata tabs** — Books = dense volume table (links to
  reader), Related = "More from {publisher}", Metadata = all populated fields.
  Pure logic in `lib/komga/{books,reader}.ts` (unit-tested). **Write/edit actions
  (mark-read, inline rating/tag/summary, add-to-list) are NOT here yet** — Slice 2
  (P2L-155…158). Note: `GET /series?author=` is ignored by Komga (returns the
  whole library), so author/collection-based Related waits on the
  `POST /series/list` migration (P2L-163).
- **Command Palette** (⌘K / Ctrl-K) — server-backed series search + navigation,
  jump-to-library, localStorage recents.

## Architecture (as-built)

- **Stack:** Vite + **React 19** + TypeScript, Tailwind v4 + **shadcn/ui (base-ui
  variant, default dark theme)**, TanStack Query v5 + TanStack Virtual,
  **react-router-dom v7** (URL state via `useSearchParams`), lucide-react,
  Vitest + Testing Library. (The spec said React 18 / RR v6 — the scaffold
  pulled newer majors; APIs used are compatible.)
- **Proxy/auth (load-bearing):** the client only ever calls the relative path
  `/komga/api/v1/…` (incl. `<img src>` thumbnails). The Vite dev server proxies
  `/komga/*` → `KOMGA_BASE_URL` and injects `X-API-Key` from `.env`
  (`vite.config.ts`). This is mandatory: **Komga blocks CORS (403 preflight)**
  and **thumbnails 401 without the key**. Keep the relative path — production
  hosting will mirror it with a reverse proxy (see Backlog).
- **Data layer** (`src/lib/komga/`): `client.ts` (fetch wrapper, throws on
  non-ok), `types.ts` (DTO subset), `mapping.ts` (`SeriesDto → SeriesVM` +
  `parseRating`/`parseGoodreads`/`pickAuthor`), `filters.ts` (the `Filters`
  model + URL↔Komga-param bijections + `resetFiltersKeepingSort`),
  `progress.ts` (`Progress` + `readPct`), `queries.ts` (TanStack hooks +
  `flattenSeries`/`totalSeries`/`nextPageParam`). All pure logic is unit-tested.
- **State flow:** `LibraryBrowser` holds the single source of truth — `filters`
  (from the URL via `useFilters`) + `view`/`density` (localStorage via
  `usePersistentState`) — and fans them one-directionally to Sidebar / Toolbar /
  FilterPanel / ActiveFilters / Grid / List. Every child mutates via `setFilters`.
- **Responsive (P2L-164, shipped):** mobile-first below the `md` (768px)
  breakpoint; tablet uses the desktop layout. A `useIsMobile()` hook
  (`hooks/useIsMobile.ts`, matchMedia `(max-width: 767px)`, exports
  `MOBILE_QUERY`) gates *structural* changes; styling-only changes use Tailwind
  `md:`. On mobile: `AppShell` renders a top bar + hamburger **left-`Sheet`
  drawer** (reusing `<Sidebar>` verbatim); the filter panel is a **right-`Sheet`**
  (`MobileFilterSheet`, sharing `FilterPanelInner` with the desktop `<aside>`);
  the Toolbar makes search full-width and hides the view/density toggles, and the
  grid is forced (dense list is desktop-only); `SeriesDetail` uses a compact hero,
  forces the Books **card** view, and makes "Open in Komga" icon-only. Card hover
  quick-actions are **not rendered** on mobile (they were touch-unreachable — and
  the invisible mark-read button was tappable; both fixed). Tests use the
  `matchMedia` mock in `src/test/setup.ts` + `mockViewport()` in
  `src/test/viewport.ts`. **Light mode** is split out to **P2L-168** (deferred).

## Filter & Navigation IA redesign (as-built, P2L-164 + P2L-162/163 scope)

- **Library scope (not a facet):** `Filters.library?: string` is a single-select
  scope surfaced as a grouped (Franchise / Publisher / Universe), searchable
  `ScopePicker` in the top toolbar — **not** a multi-select facet. URL param is
  `?library=<id>`. The old repeatable `?libraryId=` param is not back-compat
  shimmed; it is silently ignored on read.
- **Left rail is now `FacetRail`:** scope-aware SmartFolders + the facet list.
  The old nav `Sidebar`, its Collections and Read-Lists sections, and the
  associated TanStack queries + client methods/DTOs have been deleted.
- **Mobile layout:** one filter sheet, opened from the toolbar's **Filters**
  button (mobile-only). The old hamburger drawer is gone. Desktop keeps the
  two-column grid with the rail always visible.
- **Scope-aware smart folders:** applying a smart folder preserves the active
  `library` scope and clears every other facet. A facet "Reset" / "Clear all"
  also preserves the scope (scope lives in the toolbar, not the filter chips).
- **Still deferred:** facet counts (P2L-167), rating writes (P2L-156), light
  mode (P2L-168).

## Back navigation + scroll restoration (as-built, P2L-169)

- **Back arrow** (Series Detail top bar) = history back via `useSmartBack`
  (`src/hooks/useSmartBack.ts`): `navigate(-1)` when there is in-app history,
  else `navigate('/')` (deep-link fallback, detected by
  `location.key === 'default'`). Restores the exact previous list URL
  (filters/sort/scope/search) and works for the browser/trackpad back gesture too.
- **Breadcrumb library name** = a distinct `<Link to={`/?library=${libraryId}`}>`
  — jumps to that library scoped (fresh list), no longer a duplicate "back".
- **Scroll position** is restored per `` `${location.key}|${view}` `` via
  `useScrollRestore` (module `Map`, `src/hooks/useScrollRestore.ts`):
  `LibraryBrowser` passes `initialOffset` + `save` to `SeriesGrid`/`SeriesList`,
  which feed `initialOffset` to the TanStack Virtual virtualizer and set
  `scrollTop` once in a mount `useLayoutEffect`; the scroll container's
  `onScroll` keeps the cache fresh. In-memory only (resets on full reload); if
  the query cache is evicted (> `gcTime`) the offset clamps to available content.
- **Test note:** SeriesGrid's test needs a `ResizeObserver` shim, kept
  **file-local** in `SeriesGrid.test.tsx` — a global shim in `test/setup.ts`
  pushes base-ui's ScrollArea (ScopePicker etc.) into a jsdom-incompatible
  `getAnimations()` path (6 unhandled errors + non-zero exit despite passing tests).

## File map

```
src/
  main.tsx App.tsx index.css           # providers (QueryClient + TooltipProvider), router, theme
  lib/
    komga/{client,types,mapping,filters,progress,queries}.ts   # + *.test.ts
    library.ts                          # prettyLibraryName, SMART_PRESETS (kept out of components for fast-refresh)
    utils.ts                            # cn()
  hooks/{usePersistentState,useFilters,useSmartBack,useScrollRestore}.ts
  components/
    ui/*                                # shadcn (base-ui) generated
    AppShell, Sidebar, Toolbar, ActiveFilters, FilterPanel,
    SeriesGrid, SeriesList, SeriesCard, SeriesRow,
    Stars, ReadProgress, StatusDot, CoverImage, CommandPalette
  routes/{LibraryBrowser, SeriesDetail}.tsx
```

## Non-obvious gotchas (read before editing)

1. **shadcn here is the base-ui variant, not radix; `command` is cmdk.**
   `Checkbox`/`Select` use `checked`/`value` + `onCheckedChange`/`onValueChange`
   `(value, eventDetails)` signatures. The generated `CommandDialog` does **not**
   wrap a cmdk `Command`, so `CommandPalette.tsx` composes `Dialog` + `Command`
   directly with `shouldFilter={false}` (results come from the server — do NOT
   let cmdk re-filter them).
2. **Rating convention** (read-only this slice): series tag `rating:X.XX`
   (Goodreads avg, 1.0–5.0 in **0.05 steps, two decimals** — e.g. `rating:4.15`)
   + `rating:check` (low-confidence → amber warning) + a `links[]` entry
   `★ <avg> · Goodreads (<votes>)`. Komga **cannot sort by a tag value** →
   rating is filter-only; do not add a rating sort.
   - `parseRating` (`mapping.ts`) accepts **one or two** decimals
     (`/^rating:(\d(?:\.\d{1,2})?)$/`) so both legacy `rating:4.2` and current
     `rating:4.15` tags parse — keep this if you touch the regex. `Stars.tsx`
     renders the value with `toFixed(2)` so 0.05 buckets stay distinguishable.
   - History: buckets were 0.2/one-decimal until 2026-06-04, when the backfill
     tool (`comics-komga-ratings`) re-bucketed to 0.05; this repo's parser +
     display were widened in the same change.
3. **`GET /api/v1/series` is deprecated** (since Komga 1.19, use
   `POST /api/v1/series/list`) but works on 1.23.6 with query-param filters. It's
   isolated in `client.ts` — migrating is a one-file change (see Backlog).
4. **Node 26 + vitest/jsdom localStorage shim** lives in `src/test/setup.ts`.
   Node 26 exposes an undefined global `localStorage` that makes vitest skip
   jsdom's. **Don't remove the shim** or the `usePersistentState` tests break.
5. **Strict TS + ESLint:** `verbatimModuleSyntax` (use `import type`),
   `noUnusedLocals`/`noUnusedParameters`, and `react-refresh/only-export-components`
   (keep non-component exports OUT of component files — that's why `library.ts`
   and `progress.ts` exist). `npm run build` typechecks tests too.
6. **Virtualization:** `SeriesGrid` is row-virtualized with **dynamic
   `measureElement`** (handles variable card height). `SeriesList` is a
   **CSS-grid `<div>`/`<Link>`** layout (NOT a `<table>` — incompatible with row
   virtualization) sharing the `SERIES_GRID_COLS` template between header and
   rows. Both trigger infinite-scroll near the end via TanStack Query's stable
   `fetchNextPage` (idempotent while in-flight).

## Lint baseline (NOT regressions — leave them)

`npm run lint` reports **4 errors + 2 warnings**, all pre-existing/vendored:
- 3 errors: `react-refresh/only-export-components` in shadcn `ui/{badge,button,tabs}.tsx`
  (their `*Variants` exports — vendored).
- 1 error: `@typescript-eslint/triple-slash-reference` in `vite.config.ts`
  (the documented `/// <reference types="vitest/config" />`).
- 2 warnings: `react-hooks/incompatible-library` on `useVirtualizer`
  (inherent TanStack Virtual + React Compiler plugin).
There are **no errors in app code**.

## Planning & backlog → Linear

Planning lives in **Linear**, not in this repo (no local `BACKLOG.md`/`TODO.md`).
Follow `external/linear/LINEAR_WORKFLOW.md` in the agents monorepo (team **P2L**,
GraphQL via `.linear_key`): pick up issues there, move state on start/finish, and
post **one append-only project update per session** (Current Focus / What Changed
/ Decisions / Dead Ends / Next Steps / Open Questions).

- **Project:** Komga Power Frontend — https://linear.app/p2lab/project/komga-power-frontend-283daf1afa30
- **Slice 2 milestone — Write actions & inline editing:** P2L-155 mark read/unread
  (foundation, Urgent), P2L-156 inline rating edit, P2L-157 tag/summary edit,
  P2L-158 add-to-readlist.
- **Backlog (no milestone):** P2L-159 Series Detail tabs · P2L-160 command-palette
  actions · P2L-161 On-Deck · P2L-162 author/publisher typeahead facets · P2L-163
  migrate to `POST /series/list` · ~~P2L-164 light mode + responsive~~ → responsive **shipped** (In Review), light mode split to **P2L-168** · P2L-165
  robustness polish + CI deploy.

Each issue carries the implementation hints (endpoints, affected files). Production
hosting is already done — see `deploy/DEPLOY.md`.

## References

- **Linear project:** https://linear.app/p2lab/project/komga-power-frontend-283daf1afa30 · workflow: `external/linear/LINEAR_WORKFLOW.md` (agents monorepo).

- **Design spec:** `docs/design-spec.md` (in this repo) — also in the agents
  monorepo at `docs/superpowers/specs/2026-06-01-komga-power-frontend-design.md`.
- **Implementation plan (historical, slice 1):** agents monorepo
  `docs/superpowers/plans/2026-06-01-komga-power-frontend.md`.
- **Rating convention source:** agents monorepo
  `docs/superpowers/specs/2026-06-01-komga-ratings-design.md`.
- **Live API:** `https://komga.p2lab.com`, OpenAPI at `applications/komga/api-docs.yaml`
  in the monorepo. 27 libraries (`xCat:Fra/Pub/Uni`), 1947 series, 1 collection,
  431 readlists, 55 genres, 121 publishers, 3 age-ratings.
