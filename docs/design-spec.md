# Komga Power Frontend — Design Spec

> **Note:** This is the original design spec (design intent, constraints,
> success criteria) authored before implementation. It is preserved here so this
> repo is self-contained. Where the as-built code differs, **`HANDOVER.md` is
> authoritative** — notably: the shipped stack is **React 19 / react-router-dom
> v7 / shadcn (base-ui variant)** (the spec says React 18 / RR v6), the list is
> a CSS-grid layout rather than a `<table>`, and `Progress`/`readPct` live in
> `lib/komga/progress.ts`. The slice described below was fully implemented and
> live-verified.

---

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
`xCat:` stripped, readlist search); `Toolbar` (live count, debounced search,
grid/list toggle, density S/M/L, sort [Title / Recently added / Recently
updated — no rating], filter toggle); `ActiveFilters` (URL-derived chips);
`SeriesGrid` (virtualized cover wall) / `SeriesList` (virtualized rows,
server-sortable Title); `FilterPanel` (read-status, library, status, genre,
publisher, age-rating, one-shot → URL); loading / error / empty states. Shared
atoms: `Stars`, `ReadProgress`, `StatusDot`, `CoverImage`.

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
See `HANDOVER.md` → Backlog for the prioritized continuation.
