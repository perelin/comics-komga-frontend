# Deploy — comics.p2lab.com

Lightweight production deploy: a single **`caddy:2-alpine`** container on the
Docker host (CT 101) that serves the prebuilt static SPA (`dist/`) and proxies
`/komga/*` to Komga with the `X-API-Key` injected server-side. Exposed at
**https://comics.p2lab.com** via the edge Caddy (CT 100) with HTTP basic-auth.
No custom image, no registry — build `dist/` locally and ship it.

```
browser ──https──> edge Caddy (CT 100, basic-auth, TLS) ──> comics container
                                                            (CT 101 :8091)
                                                            ├─ /          → static dist/
                                                            └─ /komga/*   → https://komga.p2lab.com  (+X-API-Key)
```

## Secrets (from `pass`)
- `services/komga/api-key` — injected into the container via `/opt/apps/comics/.env` as `KOMGA_API_KEY`. Never baked into the image; never sent to the browser.
- `services/comics/basic-auth` — the edge-Caddy basic-auth user/password (the bcrypt hash lives in CT 100's Caddyfile; plaintext is in pass).

## First-time deploy
```bash
# 1. Build the SPA locally (no secrets needed — client uses the relative /komga path)
cd ~/code/comics-komga-frontend && npm ci && npm run build

# 2. Ship compose + Caddyfile + dist to CT 101 (CT 101 has no rsync → use scp)
ssh pve-htz-docker 'mkdir -p /opt/apps/comics'
scp deploy/docker-compose.yml deploy/Caddyfile pve-htz-docker:/opt/apps/comics/
scp -rq dist pve-htz-docker:/opt/apps/comics/

# 3. Runtime secret on CT 101 (.env, mode 600) from pass
ssh pve-htz-docker "umask 077; printf 'KOMGA_API_KEY=%s\n' '$(pass show services/komga/api-key)' > /opt/apps/comics/.env"

# 4. Start
ssh pve-htz-docker 'cd /opt/apps/comics && docker compose up -d'

# 5. DNS: comics.p2lab.com A → 138.201.193.245 (Route53, profile p2lab-agents)
# 6. Edge Caddy (CT 100): add a comics.p2lab.com block with basic_auth → reverse_proxy 10.10.10.10:8091
#    then `caddy validate` && `systemctl reload caddy` (NEVER restart — global proxy)
```

## Update (after code changes)
```bash
cd ~/code/comics-komga-frontend && npm run build
# replace dist (no rsync on CT 101; rm first to drop stale files)
ssh pve-htz-docker 'rm -rf /opt/apps/comics/dist' && scp -rq dist pve-htz-docker:/opt/apps/comics/
# IMPORTANT: dist is a BIND MOUNT (./dist:/srv). `rm -rf` detaches the mount from
# the running container (it keeps serving the deleted inode → 404 on / and assets,
# while /komga still proxies fine). Re-bind by recreating the container:
ssh pve-htz-docker 'cd /opt/apps/comics && docker compose up -d --force-recreate comics'
```
> If you replace the dist **contents in place** instead of `rm -rf`-ing the dir,
> files are served live and no recreate is needed — but plain `scp -rq dist …`
> recreates the directory, so with the command above you must recreate.

## Notes
- The client uses the relative `/komga` path, so **the same build runs in dev and prod** — only the proxy moves (Vite dev-server ↔ this container's Caddy).
- **`dist` is bind-mounted** (`./dist:/srv:ro`). Removing the host dir while the container runs breaks the mount until a `docker compose up -d --force-recreate comics` (see Update). Recreating the comics container is safe — it is NOT the global edge Caddy.
- Edge IP `138.201.193.245` matches the other `*.p2lab.com` Caddy sites; `komga.p2lab.com` itself is on the Cloudron VM (`.254`) — we proxy to its public URL.
- **The edge basic-auth `Authorization` header must be stripped** before proxying to Komga (`header_up -Authorization` in the container Caddyfile) — otherwise Komga tries to auth it as a Komga user and 401s, ignoring `X-API-Key`.
- **Reboot survival:** the container has `restart: unless-stopped`, so Docker restarts it after a CT 101 reboot. It is *not* in CT 101's `docker-compose-up-all.sh` ordered list (add `comics` there if you want explicit boot ordering).
- **Auth gating:** the whole site (incl. `/komga/*`) is behind one shared HTTP basic-auth user (`perelin`); credentials are in `pass services/comics/basic-auth`.
- Edge Caddy config lives in `/etc/caddy/Caddyfile` on CT 100 (a `.bak` was written before the comics block was appended). Reload with `systemctl reload caddy` — **never restart** (it fronts all `*.p2lab.com`).
