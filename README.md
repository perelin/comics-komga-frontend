# comics-komga-frontend

A dense, keyboard-friendly power-user frontend for a [Komga](https://komga.org)
comic-library server. This is the first vertical slice: the **Library Browser**
is wired end-to-end against the live Komga REST API; Series Detail and the ⌘K
Command Palette are functional-but-shallow.

## Setup

```bash
cp .env.example .env        # fill in KOMGA_BASE_URL + KOMGA_API_KEY
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/komga/*` to `KOMGA_BASE_URL` and injects the
`X-API-Key` header **server-side**. This is load-bearing: it resolves Komga's
CORS restriction, lets `<img>` tags load thumbnails (which require auth), and
keeps the API key out of the browser bundle. The app only ever calls the
relative path `/komga/api/v1/…`, so a production reverse proxy (future Docker
Compose stack) can serve the same path with no client changes.

## Scripts

- `npm run dev` — dev server (with the Komga proxy)
- `npm test` — unit tests (Vitest)
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run lint` — ESLint

## What works

- **Library Browser** — virtualized grid + list over all series (TanStack
  Virtual; only the visible window renders), real covers / read-progress /
  ratings, live result count, search-within, sort (Title / Recently added /
  Recently updated), and multi-facet filters (read status, library, status,
  genre, publisher, age rating, one-shot). **All filter/sort/view state lives in
  the URL** — deep-linkable and refresh-safe.
- **Sidebar** — smart folders (Continue reading / Recently added / Unread),
  libraries (the `xCat:` prefix is stripped for display), and read-list search.
- **Series Detail** (`/series/:id`) — read-only hero (cover, author, publisher,
  status, rating + Goodreads link) and the volume list with per-book read state.
- **Command Palette** (⌘K / Ctrl-K) — server-backed series search + navigation,
  jump-to-library, and recently-visited series (localStorage).

## Ratings

Komga has no native rating field. Ratings are read from a tag convention written
by a separate backfill tool: `rating:X.X` (Goodreads average, 1.0–5.0 in 0.2
steps), an optional `rating:check` (low-confidence match → warning icon), and a
`links[]` entry `★ <avg> · Goodreads (<votes>)`. The app parses these into a
star display + Goodreads click-through. Komga cannot sort by a tag value, so
rating is **filterable but not sortable** (no rating sort option is offered).

## Stack

Vite · React · TypeScript · Tailwind + shadcn/ui (default theme, dark mode) ·
TanStack Query (server state) · TanStack Virtual · React Router (URL state) ·
lucide-react · Vitest + Testing Library.

## Out of scope (this slice)

Write actions (mark-read, rating/tag/summary editing, add-to-readlist), the
On-Deck smart folder, full Series Detail editing, Command Palette action
execution, light mode, mobile layout, and the production Docker Compose
deployment (reverse proxy + static SPA).
