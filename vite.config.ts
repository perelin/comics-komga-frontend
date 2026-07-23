/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // '' prefix => load ALL vars (incl. non-VITE_)
  return {
    plugins: [react(), tailwindcss()],
    // Expose the public Komga origin to the client for user-facing deep-links
    // (native reader + OPDS). Derived from KOMGA_BASE_URL so there is a single
    // source of truth; an explicit VITE_KOMGA_PUBLIC_URL wins if the browser-
    // facing URL differs from the proxy target. The URL is public, not a secret
    // (only KOMGA_API_KEY stays server-side). Skipped under test so specs can
    // stub the value at runtime via vi.stubEnv.
    define:
      mode === 'test'
        ? {}
        : {
            'import.meta.env.VITE_KOMGA_PUBLIC_URL': JSON.stringify(
              env.VITE_KOMGA_PUBLIC_URL || env.KOMGA_BASE_URL || '',
            ),
          },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: true, // listen on 0.0.0.0 so other machines on the LAN can reach it
      port: 5173,
      strictPort: true, // fail instead of picking a random port (predictable URL)
      allowedHosts: true, // accept requests by hostname (e.g. <machine>.local), not just IP
      proxy: {
        '/komga': {
          target: env.KOMGA_BASE_URL,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/komga/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.KOMGA_API_KEY) proxyReq.setHeader('X-API-Key', env.KOMGA_API_KEY)
            })
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      environmentOptions: {
        jsdom: { url: 'http://localhost/' },
      },
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
