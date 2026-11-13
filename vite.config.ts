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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wasm}'],
          maximumFileSizeToCacheInBytes: 10000000 // Increase limit for wasm/model artifacts
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
