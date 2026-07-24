#!/usr/bin/env bash
# One-command deploy for the comics-komga-frontend SPA.
#
#   test gate (vitest)  →  build (dist/)  →  ship over SSH  →  health check
#
# The build is a static SPA served by any reverse proxy that injects your Komga
# X-API-Key server-side (see README → Self-hosting). This script ships the built
# `dist/` to a directory on a remote host — e.g. one that's bind-mounted into
# your proxy container, so the new build is live the moment the files land.
#
# Configure it by copying `deploy.env.example` to `deploy.env` (git-ignored) and
# filling in your target. Then run `npm run deploy` from the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Load config --------------------------------------------------------------
if [ ! -f deploy.env ]; then
  echo "error: deploy.env not found." >&2
  echo "       cp deploy.env.example deploy.env  and fill in your target." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. ./deploy.env
set +a

: "${REMOTE:?set REMOTE in deploy.env}"
: "${REMOTE_DIR:?set REMOTE_DIR in deploy.env}"
HEALTHCHECK_PORT="${HEALTHCHECK_PORT:-}"
PUBLIC_URL="${PUBLIC_URL:-}"

echo "==> 1/4  Test gate (vitest)"
npm run test

echo "==> 2/4  Production build (tsc -b + vite build)"
npm run build

echo "==> 3/4  Ship dist/ to $REMOTE:$REMOTE_DIR"
# COPYFILE_DISABLE=1 stops macOS bsdtar from emitting AppleDouble (._*) entries.
# Extract into a staging dir on the host, then swap contents into the target:
# new (content-hashed) assets and index.html are written first, then files from
# the previous build that are gone now get pruned — the swap window is
# sub-second and old/new hashed assets never collide. (tar, not rsync, so no
# rsync dependency on the remote.)
COPYFILE_DISABLE=1 tar -czf - -C dist . | ssh "$REMOTE" "
  set -euo pipefail
  stage=\$(mktemp -d)
  trap 'rm -rf \"\$stage\"' EXIT
  tar -xzf - -C \"\$stage\"
  mkdir -p '$REMOTE_DIR'
  cp -a \"\$stage\"/. '$REMOTE_DIR'/
  cd '$REMOTE_DIR'
  find . -type f | while IFS= read -r f; do
    [ -e \"\$stage/\$f\" ] || rm -f \"\$f\"
  done
  find . -type d -empty -delete 2>/dev/null || true
"

if [ -z "$HEALTHCHECK_PORT" ]; then
  echo "==> 4/4  Health check skipped (HEALTHCHECK_PORT unset)"
else
  echo "==> 4/4  Health check on $REMOTE (host-local port $HEALTHCHECK_PORT)"
  local_js="$(basename "$(ls dist/assets/index-*.js | head -1)")"
  served_js="$(ssh "$REMOTE" "curl -fsS http://localhost:$HEALTHCHECK_PORT/" \
    | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)"
  if [ "$local_js" != "$served_js" ]; then
    echo "    FAIL: served bundle ('$served_js') != built bundle ('$local_js')" >&2
    exit 1
  fi
  komga_status="$(ssh "$REMOTE" \
    "curl -fsS -o /dev/null -w '%{http_code}' 'http://localhost:$HEALTHCHECK_PORT/komga/api/v1/series?size=1'")"
  if [ "$komga_status" != "200" ]; then
    echo "    FAIL: /komga proxy returned HTTP $komga_status (expected 200)" >&2
    exit 1
  fi
  echo "    OK: $local_js is live and the /komga proxy is healthy."
fi

echo "==> Done.${PUBLIC_URL:+  $PUBLIC_URL}"
