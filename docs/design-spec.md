# Komga Power Frontend — Design Spec

> **Note:** This is the original design spec (design intent, constraints,
> success criteria) authored before implementation. It is preserved here so this
> repo is self-contained. Where the as-built code differs, **`README.md` is
> authoritative** — notably: the shipped stack is **React 19 / react-router-dom
> v7 / shadcn (base-ui variant)** (the spec says React 18 / RR v6), the list is
> a CSS-grid layout rather than a `<table>`, and `Progress`/`readPct` live in
> `lib/komga/progress.ts`. The slice described below was fully implemented and
> live-verified.
>
> (This note used to name `HANDOVER.md`, which was removed in `5cdaac6` when the
> repo was prepared for public release — its as-built content now lives in the
> README. History: `git show 5cdaac6`.)

---

### Tag conventions consumed (contract note, added 2026-07-26)

The app reads two tag conventions written by
[`comics-komga-ratings`](https://github.com/perelin/comics-komga-ratings); it
never writes them. This spec predates the format convention entirely, so the
authorities live elsewhere — deliberately not restated here, to keep one source
of truth per convention:

| Convention | Vocabulary authority (ratings repo) | What this app does with it |
|---|---|---|
| `rating:<bucket>`, `rating:check`, `★ … · Goodreads` link | [`docs/design-spec.md`](https://github.com/perelin/comics-komga-ratings/blob/main/docs/design-spec.md) | `parseRating` (`lib/komga/mapping.ts`) → star display + source link; rating bounds → `ratingFacet` (`lib/komga/filters.ts`) |
| `format:<kind>` + the `format:mixed` flag | [`docs/format-classifier-spec.md`](https://github.com/perelin/comics-komga-ratings/blob/main/docs/format-classifier-spec.md) | `parseFormat` (`lib/komga/format.ts`) → Format facet, card badge, Series Detail stat-band line, `format:mixed` → the cleanup work list |

README's *How ratings work* / *How formats work* / *The series classification
chips* describe the user-facing behaviour; `lib/komga/format.ts` carries the
invariants (at most one primary tag per series; `mixed` is a flag, never a
format; untagged series get no badge and never match a format filter).

**Two corrections to the 2026-06-01 findings below** — accurate as observed,
but they no longer describe the convention:

- Buckets are **0.05 steps written with two decimals** (`rating:4.15`), not
  "1.0–5.0 in 0.2 steps". `parseRating` still accepts one decimal, so older tags
  keep displaying.
- Rating filtering is a tag match, but *not* a single `tag=rating:X.X`:
  `ratingFacet` enumerates every 0.05 bucket between the bounds as an OR. A
  one-decimal legacy tag therefore displays a star yet never matches a rating
  bound — as of 2026-07-26 that is one series in the reference library
  (`rating:3.8`). Re-rating that series writes `rating:3.80`, but the ratings
  tool has no per-series target: `--refresh` re-queries Goodreads for every
  already-rated series (~1846 calls), so in practice the tag gets fixed as a
  by-product of the next full refresh. README's chips section records the same
  consequence from the display side.

## Goal

Build a **power-user frontend** for an existing Komga comic server
(~1947 series in the reference library) — keyboard-friendly, dense, fast to
browse and filter a large library. This spec covers a **first vertical slice**:
one screen (the **Library Browser**) wired end-to-end against the live Komga
REST API, with the other two screens (Series Detail, Command Palette) routed and
shallow-but-navigable.

**Design fidelity decision (important):** The handoff mock ships a bespoke
dark/periwinkle theme and procedural cover art. **We are not reproducing that
theme.** Per the user: *"the actual theme from the mocks is not relevant — keep
as close as possible to shadcn default, KISS, functionality before
customization."* The mock is used as an **information-architecture and
interaction reference only**. Visual target = stock **shadcn/ui dark theme**.

## Context & live-API findings (validated 2026-06-01)

Probed read-only against the live server with the repo's API key:

- **27 libraries**, named with an `xCat:Fra…/Pub…/Uni…` taxonomy
  (Franchise / Publisher / Universe), e.g. `xCat:Pub Image`, `xCat:Uni Marvel`.
- **1947 series**, **1 collection**, **431 readlists** (readlists are heavily
  used; collections barely).
- Facet sizes: **47 genres**, **113 publishers**, **8133 writers**,
  **2 languages**, **3 age-ratings**, **131 distinct tags**. (As of the final
  live check: 55 genres / 121 publishers — these grow as the library does.)
- **Ratings are live.** Series carry tags like `rating:4.2` (Goodreads avg,
  **1.0–5.0 in 0.2 steps**), an optional `rating:check` (low-confidence flag),
  and a `links[]` entry `{ label: "★ 4.13 · Goodreads (106)", url: "..." }`.
  Coverage is **partial** — many series are unrated.
- **CORS is blocked** — `OPTIONS` preflight from `http://localhost:5173` returns
  **403** with no `Access-Control-Allow-Origin`. A direct browser→Komga app is
  impossible.
- **Thumbnails require auth** — `GET /series/{id}/thumbnail` returns **401**
  without the key, **200 image/jpeg** with the `X-API-Key` header.
- Series DTO (relevant fields): top-level `id, libraryId, name, oneshot,
  booksCount, booksReadCount, booksUnreadCount, booksInProgressCount,
  metadata, booksMetadata`. `metadata` = `{ status, title, titleSort, publisher,
  genres[], tags[], links[], ageRating, language, readingDirection,
  totalBookCount, summary }`. `booksMetadata.authors[]` = `{ name, role }`.

### Constraints these impose

1. **A proxy is mandatory** (CORS + thumbnail auth).
2. **No server-side sort by rating** — Komga cannot sort by a tag value. Rating
   is **filterable** (`tag=rating:X.X`) but not sortable.
3. **Large facets** (publishers, authors, readlists) need **typeahead/search**.
   Language facet (2 values) is dropped.

## Scope

**Complete this slice (Library Browser, live):** browse · virtualized grid +
list · real covers + read-progress + ratings · live sidebar (libraries /
readlists / smart folders) · search-within · sort · multi-facet filters with
**URL state** + live result count · loading / error / empty states.

**Scaffolded (routed, shallow):** `/series/:id` Series Detail (real read-only
hero + volumes); global **⌘K Command Palette** (search + navigate + recents).

**Out of scope (this slice):** all write actions (mark-read, rating/tag/summary
edit, add-to-readlist); On-Deck; light mode; mobile-first layout; multi-server;
**production hosting** (future Docker Compose stack).

## Architecture

### Auth / proxy (load-bearing)

The client **always** calls the relative path `/komga/api/v1/…` (incl.
thumbnails) and never knows the real Komga origin or key.
- **Dev:** Vite `server.proxy` maps `/komga` → `${KOMGA_BASE_URL}`, rewrites
  `/komga/api/...` → `/api/...`, and injects `X-API-Key` from a gitignored
  `.env`. Fixes CORS, makes thumbnail `<img>` work, keeps the key off the client.
- **Production (future):** a Docker Compose stack — static SPA behind a reverse
  proxy (Caddy/nginx) that proxies `/komga/*` and injects the key, mirroring the
  dev proxy. The relative `/komga` path means **no client changes** dev→prod.

### Data layer (`src/lib/komga/`)

`client.ts` (fetch wrapper), `types.ts` (DTOs), `queries.ts` (TanStack hooks +
`useSeriesInfinite` over `GET /series`, ~50/page), `mapping.ts`
(`SeriesDto → SeriesVM`: author = first `writer`; progress from the book counts;
`rating` from `rating:X.X` tag + Goodreads link + `rating:check`; `coverUrl` =
`/komga/api/v1/series/${id}/thumbnail`), `filters.ts` (the `Filters` model and
its URL ↔ Komga-param bijections; AND across fields / OR within;
smart-folder presets).

### UI — Library Browser

`AppShell` (sidebar + main grid); `Sidebar` (smart folders, libraries with
`xCat:` stripped, readlist search); `Toolbar` (live count, debounced search
with a × / Esc clear that skips the debounce, grid/list toggle, density S/M/L,
sort [Title / Recently added / Recently updated — no rating], filter toggle);
`ActiveFilters` (URL-derived chips);
`SeriesGrid` (virtualized cover wall) / `SeriesList` (virtualized rows,
server-sortable Title); `FilterPanel` (read-status, library, status, genre,
publisher, age-rating, one-shot → URL); loading / error / empty states. Shared
atoms: `Stars`, `ReadProgress`, `StatusDot`, `CoverImage`.

**Toolbar wrap contract.** The toolbar's controls need ~850px before the search
field gets any width, so the row **must stay `flex-wrap` at every breakpoint**
and every control group must be `shrink-0`. Otherwise the search wrapper is the
only shrinkable child and silently absorbs the whole shortfall — it collapsed to
a 48px icon box below ~1400px, and the overflow disappeared into `main`'s
`overflow-hidden`, making sort unreachable on iPad and 1024–1280 laptops.
Widths here are verified by measuring a real browser; jsdom does no layout, so
the unit test can only guard the classes.

### Scaffolded routes

`SeriesDetail` (real read-only hero + volumes); `CommandPalette` (⌘K, server
search + navigate + localStorage recents).

## Success criteria

- `npm run dev` serves the app; the Library Browser shows real series, covers,
  read-progress, and ratings from the configured Komga server.
- All 1947 series scroll smoothly in grid and list (virtualized).
- Filter / sort / search update results **and the URL**; reload restores the
  view; the count is live.
- Sidebar libraries / readlists / smart folders scope correctly.
- ⌘K works; `/series/:id` shows real read-only detail.
- The API key never appears in the client bundle or network tab.

## Out of scope (recap) / next passes

Write actions, On-Deck, full Series Detail editing, Command Palette action
execution, light mode, mobile layout, and the production Docker Compose stack.

(The prioritized continuation used to live in `HANDOVER.md` → Backlog; that file
was removed in `5cdaac6` — **README → Roadmap is the current list**, and
`git show 5cdaac6:HANDOVER.md` has the historical backlog. Some items above have
since shipped, so read this section as the v1 slice boundary, not as today's
scope.)
