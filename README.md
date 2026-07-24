# Komga Power Frontend

A dense, keyboard-friendly, power-user web frontend for a
[Komga](https://komga.org) comic-library server. It talks to your existing
Komga instance over its REST API and gives you a faster, more information-rich
way to browse and explore your library — a virtualized grid, deep multi-facet
filtering, a ⌘K command palette, and an ambient Series Detail page.

> **Status: alpha.** Vertical slice 1 (the Library Browser) is complete and
> wired end-to-end against the live Komga API. Series Detail and the command
> palette are functional but read-only. Everything here is **read-only today** —
> the app never writes to your library. Expect rough edges, dark-mode only, and
> a desktop-first layout. Feedback and issues are very welcome.

## What it does

- **Library Browser** — a virtualized grid + list over your entire library
  (only the visible window renders, so 10k+ series stay smooth). Real covers,
  read-progress, and ratings; a live result count; search-within; sort (Title /
  Recently added / Recently updated); and multi-facet filters (read status,
  library, publication status, genre, publisher, age rating, one-shot). A
  **Series ⇄ Issues toggle** switches between series-grouped browsing and a flat
  individual-issue view. **All filter/sort/view state lives in the URL**, so any
  view is deep-linkable and survives a refresh.
- **Sidebar** — smart folders (Continue reading / Recently added / Unread),
  your libraries, and read-list search.
- **Series Detail** — a read-only hero (cover, author, publisher, status,
  rating) with a summary (falling back to volume 1 when the series has none),
  full credits + format stat band (writer / art / colors / editor, publisher,
  issue count · avg pages · format), link pills, and an ambient
  progressive-blur cover backdrop.
- **Command Palette** (⌘K / Ctrl-K) — server-backed series search, jump-to
  navigation, and recently-visited series.

## Requirements

- A running **[Komga](https://komga.org) server** you can reach over HTTP(S).
- A Komga **API key** (Komga → *Account Settings* → *API Keys*).
- **Node.js 20+** and npm.

## Quick start (development)

```bash
git clone https://github.com/perelin/comics-komga-frontend.git
cd comics-komga-frontend
cp .env.example .env        # fill in KOMGA_BASE_URL + KOMGA_API_KEY
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/komga/*` to your `KOMGA_BASE_URL` and injects the
`X-API-Key` header **server-side**. This is load-bearing: it resolves Komga's
CORS restriction, lets `<img>` tags load thumbnails (which require auth), and
keeps your API key out of the browser bundle. The app only ever calls the
relative path `/komga/api/v1/…`.

## Scripts

- `npm run dev` — dev server (with the Komga proxy)
- `npm run build` — typecheck (`tsc -b`) + production build into `dist/`
- `npm test` — unit tests (Vitest)
- `npm run lint` — ESLint

## Self-hosting (production)

The production build is a static SPA (`dist/`). Because the app only ever calls
the relative path `/komga/*`, **any reverse proxy works** — the one requirement
is that the proxy injects your `X-API-Key` header server-side (never ship the
key to the browser). Point `/komga/*` at your Komga server and serve `dist/`
with a client-side-routing fallback to `index.html`.

A minimal [Caddy](https://caddyserver.com) example:

```caddy
:80 {
	encode gzip zstd

	# Strip the /komga prefix and inject the API key server-side.
	handle_path /komga/* {
		reverse_proxy https://komga.example.com {
			header_up Host komga.example.com
			header_up X-API-Key {$KOMGA_API_KEY}
		}
	}

	# Static SPA with client-side-routing fallback.
	handle {
		root * /srv/dist
		try_files {path} /index.html
		file_server
	}
}
```

```bash
npm run build
# serve ./dist behind the proxy above, with KOMGA_API_KEY set in its environment
```

nginx, Traefik, or any other proxy that can add a request header works the same
way. A first-party Docker image is on the roadmap.

### Scripted deploy (`npm run deploy`)

If your host serves `dist/` from a directory you can reach over SSH (e.g. one
bind-mounted into the proxy container), `npm run deploy` does the whole cycle:
test gate → build → ship over SSH (via `tar`, no `rsync` needed on the remote)
→ optional health check. Configure the target once:

```bash
cp deploy.env.example deploy.env   # git-ignored; set REMOTE, REMOTE_DIR, …
npm run deploy
```

`REMOTE` is any host/alias from your `~/.ssh/config` (a bastion/ProxyJump is
handled there). Set `HEALTHCHECK_PORT` to verify the deployed bundle and the
`/komga` proxy after shipping, or leave it empty to skip that check.

## How ratings work

Komga has no native rating field, so this app reads ratings from a **tag
convention** (written by a separate backfill tool —
[`comics-komga-ratings`](https://github.com/perelin/comics-komga-ratings) —
not by this app):

- `rating:X.XX` — e.g. `rating:4.15` (a 1.0–5.0 average, two decimals). One or
  two decimals are both accepted, so legacy `rating:4.2` still works.
- `rating:check` — optional low-confidence marker (shows a warning icon).
- a `links[]` entry like `★ <avg> · Goodreads (<votes>)` for click-through.

The app parses these into a star display plus a source link. Because Komga
can't sort by a tag value, rating is **filterable but not sortable**. If your
library doesn't use this convention, ratings simply won't appear — everything
else works unchanged.

## Tech stack

Vite · React · TypeScript · Tailwind + shadcn/ui (dark mode) · TanStack Query
(server state) · TanStack Virtual · React Router (URL state) · lucide-react ·
Vitest + Testing Library.

## Roadmap

Not in this alpha, planned next:

- **Write actions** — mark-read, inline rating / tag / summary editing,
  add-to-readlist.
- The **On-Deck** smart folder and richer Series Detail editing.
- **Command Palette action execution** (beyond navigation).
- **Light mode** and a **mobile/responsive** layout.
- A first-party **Docker image** for one-command self-hosting.

## License

[MIT](LICENSE) © Sebastian Patino-Lang

This is an independent project and is not affiliated with or endorsed by the
Komga project.
