# First-party image: builds the SPA, builds the Go server, then runs the
# server on :80. The server serves the SPA, gates everything behind a
# single-password login (signed HttpOnly cookie), and proxies /komga/* to
# your Komga server with the API key injected server-side.
#
#   docker build -t comics-komga-frontend \
#     --build-arg VITE_KOMGA_PUBLIC_URL=https://komga.example.com .
#   docker run -p 8080:80 \
#     -e APP_PASSWORD=… \
#     -e KOMGA_BASE_URL=https://komga.example.com \
#     -e KOMGA_API_KEY=… comics-komga-frontend
#
# See README → Docker for what belongs at build time vs. run time.

# ---- SPA build: test gate, then production build -----------------------------
# Node 22 (not 20) because Vite 8 requires >=22.12 / >=20.19.
FROM node:22-alpine AS spa
WORKDIR /app

# Dependencies first, from the lockfile, so this layer caches across code edits.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The public Komga origin is baked into the bundle at build time (vite.config.ts
# → define) for the native-reader and OPDS deep-links. It is public, not a
# secret. KOMGA_API_KEY is deliberately NOT a build arg — it is read at run time
# by the server and must never reach the bundle.
ARG VITE_KOMGA_PUBLIC_URL=""
ENV VITE_KOMGA_PUBLIC_URL=$VITE_KOMGA_PUBLIC_URL

# Test gate: a red suite fails the image build, and therefore the deploy.
RUN npm run test

RUN npm run build

# ---- Server build: its own test gate, then a static binary --------------------
FROM golang:1.25-alpine AS server
WORKDIR /src

COPY server/go.mod server/go.sum* ./
RUN go mod download

COPY server/ ./

# The Go suite is part of the same build gate: a red test fails the image
# build, and therefore the deploy.
RUN CGO_ENABLED=0 go test ./... \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server .

# ---- Runtime: the Go server serves the SPA and proxies /komga ------------------
FROM alpine:3
RUN apk add --no-cache ca-certificates
COPY --from=server /out/server /usr/local/bin/server
COPY --from=spa /app/dist /srv
EXPOSE 80

# /healthz answers without touching Komga, so an upstream outage doesn't mark the
# container unhealthy. busybox wget ships in the alpine image.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD wget -q -O /dev/null http://localhost/healthz || exit 1

CMD ["server"]
