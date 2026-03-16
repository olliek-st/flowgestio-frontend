// vite.config.js (ESM)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
  },
  plugins: [react()],
  resolve: {
    // lets you import like: import x from "@/utils/foo"
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: {
    host: true,
    port: 5173,
    // Dev-only: proxies /api to your local Express server on :4000.
    // When deploying to Vercel, this proxy is ignored (frontend will call the deployed API URL).
    proxy: {
      // All /api/* → backend on :4000 (includes /api/llm/draft-section)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[vite-proxy] error', err)
          })
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[vite-proxy] →', req.method, req.url)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[vite-proxy] ←', proxyRes.statusCode, req.url)
          })
        },
      },
    },
  },
})
