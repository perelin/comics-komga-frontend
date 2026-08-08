# First-party image: builds the SPA and serves it behind Caddy, which proxies
# /komga/* to your Komga server with the API key injected server-side.
#
#   docker build -t comics-komga-frontend \
#     --build-arg VITE_KOMGA_PUBLIC_URL=https://komga.example.com .
#   docker run -p 8080:80 \
#     -e KOMGA_BASE_URL=https://komga.example.com \
#     -e KOMGA_API_KEY=… comics-komga-frontend
#
# See README → Docker for what belongs at build time vs. run time.

# ---- Build stage: test gate, then production build ---------------------------
# Node 22 (not 20) because Vite 8 requires >=22.12 / >=20.19.
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, from the lockfile, so this layer caches across code edits.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The public Komga origin is baked into the bundle at build time (vite.config.ts
# → define) for the native-reader and OPDS deep-links. It is public, not a
# secret. KOMGA_API_KEY is deliberately NOT a build arg — it is read at run time
# by Caddy and must never reach the bundle.
ARG VITE_KOMGA_PUBLIC_URL=""
ENV VITE_KOMGA_PUBLIC_URL=$VITE_KOMGA_PUBLIC_URL

# Test gate: a red suite fails the image build, and therefore the deploy.
RUN npm run test

RUN npm run build

# ---- Runtime stage: Caddy serves the SPA and proxies /komga ------------------
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
