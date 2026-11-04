import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { VitePWA } from 'vite-plugin-pwa';

// ShadowScan MVP — Lean build config (original backed up as vite.config.ts.full-backup)
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
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'ShadowTalk AI',
          short_name: 'ShadowTalk',
          description: 'Agentic AI workspace with offline support',
          theme_color: '#000000',
          background_color: '#000000',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
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
