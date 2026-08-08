import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker is only generated during `vite build`.
      // `npm run dev` is unaffected — HMR works normally.
      devOptions: { enabled: false },
      manifest: {
        name: 'Pool Sports Leipzig',
        short_name: 'PSL',
        description: 'Reservierungsdashboard — Pool Sports Leipzig',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#1e293b',
        icons: [
          {
            src: '/pwa-512.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache-first: app shell assets (JS, CSS, HTML, icons)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Network-first: all API calls — backend is authoritative, stale API
        // responses are never acceptable.
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/ws.*/i,
            handler: 'NetworkOnly', // WebSocket — never cache
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
