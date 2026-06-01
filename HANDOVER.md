# HANDOVER — comics-komga-frontend

> For the next agent (or human) picking up this repo. Read this first, then
> `README.md` (user-facing) and `docs/design-spec.md` (original design intent).
> This file is **as-built** and authoritative where it differs from the spec.

## TL;DR

A power-user web frontend for the Komga comic server at `https://komga.p2lab.com`.
**Vertical slice 1 is complete, reviewed, and live-verified.** The **Library
Browser** is fully wired against the live API; **Series Detail** and the **⌘K
Command Palette** are functional-but-shallow. Repo:
`git@github.com:perelin/comics-komga-frontend` (private). Runs on the Mac Mini
`FreddieMercuryMacMini` and is reachable on the LAN.

## Quick start

```bash
cp .env.example .env        # set KOMGA_BASE_URL + KOMGA_API_KEY (same values as
                            # the agents monorepo applications/komga/.env)
npm install
npm run dev                 # http://localhost:5173  (also LAN: see below)
npm test                    # 38 tests (Vitest)
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
- **Series Detail** (`/series/:id`) — real read-only hero (cover, author,
  publisher, status, rating + Goodreads link, summary) + volume list with
  per-book read state.
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

## File map

```
src/
  main.tsx App.tsx index.css           # providers (QueryClient + TooltipProvider), router, theme
  lib/
    komga/{client,types,mapping,filters,progress,queries}.ts   # + *.test.ts
    library.ts                          # prettyLibraryName, SMART_PRESETS (kept out of components for fast-refresh)
    utils.ts                            # cn()
  hooks/{usePersistentState,useFilters}.ts
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
2. **Rating convention** (read-only this slice): series tag `rating:X.X`
   (Goodreads avg, 1.0–5.0 in 0.2 steps) + `rating:check` (low-confidence →
   amber warning) + a `links[]` entry `★ <avg> · Goodreads (<votes>)`. Komga
   **cannot sort by a tag value** → rating is filter-only; do not add a rating
   sort.
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

## Backlog / next passes (roughly prioritized)

All deferred from slice 1. Endpoints/notes included so you can start fast.

1. **Write actions** (the biggest value-add):
   - Mark read / unread: `PATCH /api/v1/books/{id}/read-progress` (`{completed:true}`)
     or `DELETE` it; series-level "mark all read" iterates books. Wire the
     hover quick-actions on `SeriesCard` and the Series Detail action row.
   - **Rating edit:** write the `rating:X.X` tag via
     `PATCH /api/v1/series/{id}/metadata` (`{tags:[...], tagsLock:true}`) — mirror
     the convention from the monorepo `komga-ratings` spec. Inline star editor.
   - Tag / summary inline edit (Series Detail) via the same metadata PATCH;
     tag combobox sourced from `GET /api/v1/tags`.
   - Add-to-readlist / collection.
   - Invalidate the relevant TanStack queries after writes.
2. **Series Detail depth:** the `Related` and `Metadata` tabs (currently the page
   is a single read-only view, no tabs yet), file info, reading direction.
3. **Command Palette actions:** execute "filter by author/tag", "mark series
   read", quick-jump (⌘1–9); author search via `GET /api/v1/authors?search=`.
4. **On-Deck smart folder:** `GET /api/v1/books/ondeck` (book-level — needs a
   book card/list, not just series).
5. **Author/publisher facets as typeahead:** publisher is a filtered list today;
   author isn't a facet yet. Use `?search=` against `/authors` & `/publishers`.
6. **Migrate `GET /series` → `POST /api/v1/series/list`** (condition body) for
   future-proofing — contained in `client.ts` + `filters.ts`.
7. **Production hosting — Docker Compose stack** (the spec's explicit prod plan):
   build the static SPA, serve it behind a reverse proxy (Caddy/nginx) that
   proxies `/komga/*` to Komga and injects `X-API-Key`. Because the client uses
   the relative `/komga` path, **no client code changes** — just replicate the
   dev proxy in the prod proxy. This replaces the dev-server-on-LAN stopgap.
8. **Light mode, mobile/tablet layout** (desktop-first today).
9. **Robustness polish:** optional `isFetchingNext` guard on the infinite-scroll
   trigger; comma-in-facet-value edge case in the comma-joined Komga params.

## References

- **Design spec:** `docs/design-spec.md` (in this repo) — also in the agents
  monorepo at `docs/superpowers/specs/2026-06-01-komga-power-frontend-design.md`.
- **Implementation plan (historical, slice 1):** agents monorepo
  `docs/superpowers/plans/2026-06-01-komga-power-frontend.md`.
- **Rating convention source:** agents monorepo
  `docs/superpowers/specs/2026-06-01-komga-ratings-design.md`.
- **Live API:** `https://komga.p2lab.com`, OpenAPI at `applications/komga/api-docs.yaml`
  in the monorepo. 27 libraries (`xCat:Fra/Pub/Uni`), 1947 series, 1 collection,
  431 readlists, 55 genres, 121 publishers, 3 age-ratings.
