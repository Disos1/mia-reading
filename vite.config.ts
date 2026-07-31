import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    /**
     * Offline support (build plan Phase 7). Two reasons this is not optional:
     *
     * 1. Travel. Mia reads on a tablet abroad, where there may be no usable
     *    network. The service worker precaches the whole app shell, so it
     *    opens with nothing but the device.
     * 2. Her data. Safari evicts script-writable storage after ~7 idle days,
     *    which would wipe her stars and history over a holiday. A web app
     *    added to the Home Screen is exempt from that rule — so being
     *    installable IS the data-safety fix, not just a nicety.
     *
     * `autoUpdate` keeps deploys flowing without asking a nine-year-old to
     * confirm anything; index.html stays no-store (see index.html) so the
     * updated worker is always discovered.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name:             'מיה — קוראים יחד',
        short_name:       'קוראים',
        description:      'תרגול קריאה בעברית',
        lang:             'he',
        dir:              'rtl',
        start_url:        '/mia-reading/',
        scope:            '/mia-reading/',
        display:          'standalone',
        orientation:      'portrait',
        background_color: '#FFF7F0',
        theme_color:      '#C4A7E7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app is small; precaching everything is what makes it work with
        // no network at all. Google Fonts are cached at runtime below.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/mia-reading/index.html',
        // Take over immediately and bin the previous build's precache. Without
        // this a deploy can keep serving the old bundle from cache — observed
        // on the first live deploy, and the same stale-content class of bug the
        // math app shipped once.
        skipWaiting:  true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },   // keep dev builds free of SW caching
    }),
  ],
  base:   '/mia-reading/',
  // Honour an assigned PORT so the dev server can coexist with other projects
  // already holding 5173; falls back to the Vite default when unset.
  server: { host: true, port: Number(process.env.PORT) || 5173 },
})
