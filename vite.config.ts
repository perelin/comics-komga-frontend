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
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
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
