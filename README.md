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
  read-progress, and ratings; a live result count; search-within (clear with the
  × or Esc); sort (Title /
  Date added / Date updated / Release date / Books / Last read / Random —
  release date, newest first by default); and multi-facet filters (read status,
  library, creators, publication status, genre, publisher, age rating, rating,
  release year, format). Facets combine as **AND across fields, OR within one** — picking two
  creators shows everything either of them worked on, not just their joint work.
  With a creator filter active, each card names the searched creator(s) with the
  roles they hold in that series — solid chips for story credits
  (writer/penciller/inker/colorist), dashed and dimmed for cover-only matches —
  so a variant-cover hit is self-explanatory.
  Two exceptions: age rating is upward-open (`16+` also matches 18 or 21), and
  the *Mixed formats (cleanup)* checkbox is a separate AND term rather than
  another format choice, so ticking it alongside Singles asks for series flagged
  both. A **Series ⇄ Issues toggle** switches between series-grouped browsing
  and a flat individual-issue view. **All filter/sort/view state lives in the URL**, so any
  view is deep-linkable and survives a refresh.
- **Sidebar** — smart folders (Continue reading / Recently added / Unread),
  your libraries, and read-list search.
- **Series Detail** — a read-only hero (cover, author, publisher, status,
  rating) with a summary (falling back to volume 1 when the series has none),
  a credit stat band that lists *every* credited name per role, content-sized
  and never truncated — ranked by issue count (derived client-side from the
  volume list; regulars carry an "(n)" tally, each name its own filter link;
  writer / art / colors / editor, publisher, issue count · avg pages ·
  format), link pills, and an ambient progressive-blur cover backdrop.
- **Command Palette** (⌘K / Ctrl-K) — server-backed series search (the heading
  names the withheld remainder when a page cuts the matches), searchable
  jump-to-library navigation across every library, and recently-visited series.
- **Single-password gate** — the production server requires one shared password
  (no user management) before anything loads, including the `/komga/*` data
  proxy. Signed HttpOnly cookie, logout at `/logout`, failed-attempt throttling
  on the login form. Dev mode has no login. See [Authentication](#authentication).

## Requirements

- A running **[Komga](https://komga.org) server** you can reach over HTTP(S).
- A Komga **API key** (Komga → *Account Settings* → *API Keys*).
- **Node.js 20+** and npm for development; **Go 1.22+** only if you want to run
  the production server outside Docker.

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

There is no login in dev mode — the password gate is part of the production
server (see [Authentication](#authentication)).

## Scripts

- `npm run dev` — dev server (with the Komga proxy)
- `npm run build` — typecheck (`tsc -b`) + production build into `dist/`
- `npm test` — unit tests (Vitest)
- `npm run lint` — ESLint
- `go test ./...` (inside `server/`) — unit tests for the Go server

## Self-hosting (production)

Two paths: the **Docker image** built from this repo (batteries included —
password gate, Komga proxy, and API-key injection are all part of it), or the
**Go server alone**: build the SPA and run `server/` next to it, no Docker
involved.

One rule holds either way: the `X-API-Key` is injected **server-side**. The app
only ever calls the relative path `/komga/*`, so the browser never sees the key.

### Docker

```bash
docker build -t comics-komga-frontend \
  --build-arg VITE_KOMGA_PUBLIC_URL=https://komga.example.com .

docker run -d -p 8080:80 \
  -e APP_PASSWORD=your-instance-password \
  -e KOMGA_BASE_URL=https://komga.example.com \
  -e KOMGA_API_KEY=your-komga-api-key \
  comics-komga-frontend
```

The image builds the SPA and the Go server (each with its test suite as a build
gate) and runs the server on port 80: it serves the SPA, requires the instance
password, and proxies `/komga/*` to your Komga server. Terminate TLS at your
own edge in front of it.

| Variable | When | Purpose |
|----------|------|---------|
| `VITE_KOMGA_PUBLIC_URL` | **build** (`--build-arg`) | Browser-facing Komga origin, baked into the bundle for the native-reader and OPDS deep-links. Public, not a secret; changing it needs a rebuild. |
| `APP_PASSWORD` | run (`-e`) | The instance password — required. Everything except `/healthz` sits behind it. Changing it also invalidates all sessions. |
| `KOMGA_BASE_URL` | run (`-e`) | Where the server proxies `/komga/*`. Include the scheme. |
| `KOMGA_API_KEY` | run (`-e`) | Injected server-side on every proxied request. Never pass it as a build arg — it must not reach the bundle. |

Optional runtime knobs: `ADDR` (listen address, default `:80`), `SRV_DIR`
(Where the built SPA lives, default `/srv`), `SESSION_MAX_AGE` (cookie
lifetime as a Go duration, default `720h`).

`GET /healthz` returns `200` without touching Komga, so a health check won't
fail the container during a Komga outage.

If your edge adds basic-auth, note that the server drops the inbound
`Authorization` header before proxying — otherwise Komga tries to authenticate
those credentials as a Komga user and returns 401, ignoring the API key.

### Behind your own reverse proxy

The Go server is self-contained — it serves the SPA, enforces the password
gate, and proxies `/komga/*` — so your edge only has to terminate TLS and
forward everything. Build the SPA and run the server next to it (Go 1.22+):

```bash
npm run build
cd server
APP_PASSWORD=… KOMGA_BASE_URL=https://komga.example.com \
  KOMGA_API_KEY=… ADDR=:8080 SRV_DIR=../dist go run .
```

A minimal [Caddy](https://caddyserver.com) example for the edge:

```caddy
komga.example.com {
	reverse_proxy 127.0.0.1:8080
}
```

nginx, Traefik, or any other TLS-terminating proxy works the same way — forward
the whole origin at the server and make sure `X-Forwarded-Proto: https` reaches
it, so the session cookie gets its `Secure` flag.

### Deploying on a push (how this instance runs)

Any platform that builds a `Dockerfile` straight from a git repository deploys
this app with no extra tooling — no build server, no registry, no deploy script
in this repo. This instance runs on [Coolify](https://coolify.io): it watches
`main`, builds the image on push, and removes the previous container once the
new one reports healthy (that's what the `HEALTHCHECK` on `/healthz` is for).
Dokku, Kamal, or Portainer behave the same way.

Set `APP_PASSWORD`, `KOMGA_BASE_URL`, and `KOMGA_API_KEY` as runtime
environment variables and `VITE_KOMGA_PUBLIC_URL` as a build argument in the
platform's own settings (see the table above) — the API key must never reach
the repo or the bundle.

So: **push to `main` and the deploy is the build.** Since the test suites are
the image's build gate, a red suite means no new container rather than a broken
one.

## Authentication

The production server has a deliberately small auth layer — **one shared
password, no user management**:

- Everything except `/healthz` and `/login` is behind it — **including the
  `/komga/*` proxy**. Protecting only the page would be theater: the data
  flows through the proxy, so the gate sits in front of both.
- On success the server sets a **signed HttpOnly cookie** (`ckf_session`,
  HMAC-SHA256, `SameSite=Lax`): stateless — no session store, no JWT library.
  The signing key is derived from `APP_PASSWORD`, so changing the password
  also invalidates every outstanding session.
- Page navigations without a session are redirected to `/login?next=…` and
  land back where they were headed after signing in (`next` is validated to
  be same-origin). API and thumbnail requests get a bare **401** instead — a
  redirect to an HTML page would confuse `fetch()` and `<img>`.
- The SPA knows about the gate: every API client that receives a 401 probes
  `GET /auth/check` (a tiny endpoint that answers the session's validity and
  expiry without touching Komga). If the probe says the session is gone, the
  app redirects to the login page and returns to the exact view afterwards;
  if the session is fine, the 401 came from Komga itself and is surfaced as
  a normal error instead. In dev (no auth layer → probe 404s) nothing ever
  redirects.
- **Sign out** lives in the sidebar footer (a plain link to `/logout`, plus
  an icon in the mobile top bar). Sessions are stateless, so logout deletes
  the cookie client-side; a copy of it made before logout stays valid until
  it expires (`SESSION_MAX_AGE`, default 30 days). Rotating `APP_PASSWORD` is
  the force-revoke-everything button.
- `/login` throttles wrong passwords: after 5 failures within 10 minutes from
  one address, further wrong attempts get `429` until the window expires. A
  correct password always gets through — typos never lock you out for good.
- **Logout** at `/logout`. Sessions are stateless, so logout deletes the
  cookie client-side; a copy of it made before logout stays valid until it
  expires (`SESSION_MAX_AGE`, default 30 days). Rotating `APP_PASSWORD` is
  the force-revoke-everything button.
- The password is compared in constant time, but it lives in an environment
  variable — anyone who can read the container's env can read it, same as
  `KOMGA_API_KEY`. This is a fence for a private instance, not multi-user
  auth.

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

## How formats work

The same backfill tool also writes a **format tag convention**
([spec](https://github.com/perelin/comics-komga-ratings/blob/main/docs/format-classifier-spec.md)):
one primary tag per series — `format:singles`, `format:tpb`, `format:omnibus`,
`format:oneshot`, `format:ogn` — plus an optional `format:mixed` data-quality
flag that rides alongside the primary (floppies and trades shelved in one
series, a cleanup candidate).

The app turns these into a **Format filter** (multi-select over the five
primary formats, plus a "Mixed formats" toggle for the cleanup work list), a
format badge on series cards, and the format line in the Series Detail stat
band (which falls back to a pages-per-book heuristic for untagged series).
Untagged series are treated as *unknown*: no badge, and they never match a
format filter.

## The series classification chips

Series Detail lists **every** genre and tag — tags unioned across series and
book level, deduped — both as chips under the stat blocks and in the Metadata
tab, mirroring the tag row on Komga's own series page. Convention tags
(`format:*`, `rating:*`) are *not* hidden just because they also drive
first-class UI: on a convention-tagged library they are frequently the only
tags a series carries, so filtering them left most series with no visible tag
list at all.

Three tiers, ordered and styled so the visual weight falls off monotonically:

| Tier | What | Chip | Links to |
| --- | --- | --- | --- |
| 1 | genres | filled bright | the `genre` facet |
| 2 | free-form tags | filled muted | — |
| 3 | `format:*`, `rating:*` | outline | the format facet (`format:*` only) |

`rating:*` chips are inert because the convention includes non-numeric buckets
(`rating:nomatch`, `rating:check`) that no rating bound can express, plus stray
1-decimal values the 0.05 grid never matches; free-form tags are inert because
there is no tag facet in `Filters`. Genres live here only — the hero used to
show them too, which duplicated them a few hundred pixels apart.

## Tech stack

Vite · React · TypeScript · Tailwind + shadcn/ui (dark mode) · TanStack Query
(server state) · TanStack Virtual · React Router (URL state) · lucide-react ·
Vitest + Testing Library — served by a small dependency-free Go server
(`server/`: password gate, static serving, Komga proxy).

## Roadmap

Not in this alpha, planned next:

- **Write actions** — mark-read, inline rating / tag / summary editing,
  add-to-readlist.
- The **On-Deck** smart folder and richer Series Detail editing.
- **Command Palette action execution** (beyond navigation).
- **Light mode** and a **mobile/responsive** layout.

## License

[MIT](LICENSE) © Sebastian Patino-Lang

This is an independent project and is not affiliated with or endorsed by the
Komga project.
