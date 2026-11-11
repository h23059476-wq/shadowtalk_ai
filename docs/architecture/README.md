# Architecture and runtime map

## System shape

```text
Browser
  └─ src/main.tsx
      ├─ global error/performance setup and PWA registration
      └─ src/App.tsx
          ├─ React contexts and TanStack Query
          ├─ React Router pages
          ├─ Firebase-backed app client
          ├─ AI chat/provider modules
          └─ feature services and browser-only tools

Firebase Hosting serves dist/ and applies SPA fallback.
Firebase Functions v2 exposes chat, image, audio-demo, and drive-demo endpoints.
Firestore and Storage client access is constrained by repository rules.
```

## Browser entry and app shell

`src/main.tsx` initializes global error handling, performance/device helpers, registers the PWA service worker, and renders `App` under React StrictMode and HelmetProvider. It also schedules code that unregisters all registered service workers. Because registration and unregistration both exist, do not assume the production service worker remains active; verify this path before changing or relying on offline caching.

`src/App.tsx` creates a TanStack Query client and composes providers for auth, security, shadow memory, auto-improvement, themes, AI keys, and UI state. React Router v6 declares the pages; many are lazy-loaded. `/` redirects to `/home`. Some routes redirect to other pages, and a number of routes intentionally render a coming-soon page.

## Backend and persistence

Firebase is the configured backend (`src/integrations/firebase/app.ts`). `src/integrations/local/client.ts` lazily exposes a compatibility surface called `backend`; its implementation is `src/integrations/firebase/adapter.ts`:

- `auth`: Firebase Authentication adapter.
- `from`: Firestore query adapter with a subset of Supabase/PostgREST-style operations.
- `storage`: Firebase Cloud Storage adapter.
- `channel`/listeners: Firestore-backed realtime behavior.
- `functions.invoke`: HTTPS call to the configured Functions base URL, with the current Firebase ID token when available.

The Firestore adapter translates common query operations and can apply some filters/sorts in memory. It is not a SQL database, a PostgREST server, or a complete Supabase implementation. `src/integrations/supabase/` and `supabase/functions/` are retained code; inspect imports and deployment targets before treating them as active.

## Main application areas

- Chat workspace: `src/pages/ChatbotPage.tsx`, `src/components/chat/`, chat hooks, and `src/lib/cloudChat.ts`.
- Account and settings: auth/profile/settings pages and `src/components/AuthProvider.tsx`.
- Memory and identity: `src/contexts/ShadowMemoryContext.tsx`, memory hooks, Shadow Memory and Shadow Twin pages.
- Local inference: `src/ai/`, `src/offline/`, and `@mlc-ai/web-llm`.
- Developer tools: IDE and Computer Mode pages/components, including WebContainer integration.
- Public pages: company, legal, support, SEO, docs, and founder routes.
- Server: the separate `functions/` TypeScript package.

See [AI request paths](ai-and-request-flows.md), [data/security](data-and-security.md), and the [feature inventory](feature-inventory.md) for details and known gaps.

## Hosting and build

Vite builds the browser bundle into `dist/`. `npm run build` then invokes `prerender.cjs`, which serves the build locally with Puppeteer and prerenders its configured route list. Firebase Hosting uses `dist`, applies COOP/COEP/CORP headers, and rewrites unmatched paths to `/index.html`. Static files in `public/` are copied into the hosting output and served directly where they match a request.

`vite.config.ts` defines manual chunks, PWA plugin configuration, and COOP/COEP headers for development. The prerender route list is maintained separately from React routes; keep them aligned where prerendering is required.
