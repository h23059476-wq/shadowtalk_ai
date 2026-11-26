import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

// ShadowTalk AI — Vite build configuration.
// (Historical note: this file was once part of a "ShadowScan MVP" experiment
// whose original was backed up as vite.config.ts.full-backup. That backup is
// no longer in the repository. This is the canonical ShadowTalk config.)
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    base: '/',
    server: {
      host: "::",
      port: 8080,
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
    },
    build: {
      target: 'es2020',
      minify: isProduction ? 'esbuild' : false,
      sourcemap: isProduction ? false : true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/analytics', 'firebase/remote-config'],
            'vendor-ui': ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-toast', 'sonner'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-editor': ['@monaco-editor/react'],
            'vendor-ai': ['@mlc-ai/web-llm']
          }
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Batch 5: removed 'masked-icon.svg' — the file does not exist in
        // public/, so including it made the precache manifest reference a 404.
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'ShadowTalk AI',
          short_name: 'ShadowTalk',
          description: 'Agentic AI workspace with offline support',
          // Batch 5: stable install identity (recommended for PWA updates to
          // target the same installed app across manifest revisions).
          id: '/',
          // Install criteria fix: Chrome refuses to fire `beforeinstallprompt`
          // unless the manifest declares display: standalone (the default is
          // 'browser', which fails Chrome's installability requirements), so
          // the in-app install button could never trigger the native prompt.
          // start_url and scope pin the installed app to the site root.
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          start_url: '/',
          scope: '/',
          orientation: 'any',
          lang: 'en',
          dir: 'ltr',
          categories: ['productivity', 'utilities'],
          prefer_related_applications: false,
          // Batch 5: align theme_color with index.html (#050508). The old
          // value (#000000) disagreed with the <meta name="theme-color">,
          // producing a mismatched title-bar/splash color on Android.
          theme_color: '#050508',
          background_color: '#000000',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              // Batch 5: mark icons as maskable so Android adaptive icons
              // render without cropping the artwork.
              purpose: 'any maskable'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Pre-caches the app shell ONLY: hashed js/css/html, icons, and the
          // two small latin text fonts (inter, jetbrains ~0.4MB combined).
          // NEVER raises above ~10MB per file and never hardcodes model
          // weights: the multi-GB shards flow through web-llm's per-shard
          // Cache API at runtime (see src/services/modelManager.ts), so PWA
          // install stays fast even on slow networks.
          //
          // 2026-11-26 quota incident: the previous glob precached EVERYTHING
          // under dist — including the 3.9MB Material Symbols icon font, the
          // 4MB of /docs PDFs and the 436KB og-image — pushing every
          // first-time visit to ~10MB and exhausting the Spark plan's
          // 360MB/day Hosting quota after ~35 visitors (HTTP 509
          // 'Quota Exceeded'). Heavy assets are now runtime-cached instead:
          // fetched once on demand, then offline-available from the SW cache
          // plus the new 30-day immutable HTTP headers (firebase.json).
          globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,json,wasm,woff,woff2,webmanifest,webp,webm,mp4}'],
          // Marketing media and documents are NOT app shell:
          // - shadowtalk-trailer-30s.mp4 (2.2MB) streams on demand on the
          //   home page; its tiny poster webp still precaches so the offline
          //   player shows artwork.
          // - material-symbols-outlined (3.9MB) is only used by
          //   LiveVoiceMode; runtime-cached on first voice-mode render.
          // - /docs PDFs (4MB) are downloads, runtime-cached on demand.
          // - og-image.png (436KB) is fetched by link unfurlers, never
          //   needed offline.
          globIgnores: [
            '**/shadowtalk-trailer-30s.mp4',
            '**/fonts/material-symbols-outlined-*.woff2',
            '**/docs/**',
            '**/og-image.png',
            // Tier-1 local inference runtime (scripts/copy-ort-wasm.mjs →
            // public/onnx/): ~24MB of onnxruntime WASM downloaded on demand
            // with the first pipeline, runtime-cached — never precached, or
            // every first visit would re-kill the Hosting bandwidth quota.
            '**/onnx/**',
          ],
          maximumFileSizeToCacheInBytes: 10000000, // Increase limit for wasm/model artifacts
          runtimeCaching: [
            {
              // Self-hosted heavy fonts (Material Symbols icon font, any
              // future display faces): CacheFirst so voice mode renders
              // offline after the first use without re-downloading 3.9MB.
              urlPattern: /\/fonts\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'st-fonts',
                expiration: { maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // Documentation PDFs: downloaded on demand, kept offline after
              // first fetch (CacheFirst mirrors how users treat a download).
              urlPattern: /\/docs\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'st-docs',
                expiration: { maxEntries: 8, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // Model infrastructure on raw.githubusercontent.com: the
              // built-in weights mirror (orphan `weights` branch) and the
              // web-llm model_lib WASMs (mlc-ai binary-mlc-llm-libs).
              // Stale-while-revalidate keeps small downloads working even
              // when the network is flaky mid-session, and refreshes in the
              // background once a connection is back. Responses are
              // CORS-clean (ACAO: *), so nothing opaque enters the cache.
              // NOTE: `.bin` weight shards are EXCLUDED — web-llm already
              // stores every shard in its own Cache API under "webllm/model",
              // and double-caching them here burned ~2x storage (~1.2GB for
              // the 0.5B twins) and accelerated eviction pressure on
              // low-disk Android devices.
              urlPattern: /^https:\/\/raw\.githubusercontent\.com\/(?!.*\.bin(?:\?|$)).*$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'st-raw-github',
                expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
