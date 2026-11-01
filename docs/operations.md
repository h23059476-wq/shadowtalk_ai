# Build, configuration, and deployment

## Commands

```sh
npm ci
npm run dev
npm run build
npm run lint
npm test
npm ci --prefix functions
npm --prefix functions run build
```

`npm run build` runs `vite build` and then `node prerender.cjs`. The prerender script uses Puppeteer and treats its absence/launch failure as non-fatal. The web TypeScript configuration and Functions TypeScript configuration are separate; a successful Vite build does not establish that Functions compile or that tests/lint pass.

## Runtime configuration

The Firebase project default is `shadowtalk-ai-7a513` in `.firebaserc`, and web defaults are defined in `src/integrations/firebase/app.ts`. Local environment overrides use `VITE_FIREBASE_*` keys listed in `env.example`. `VITE_FIREBASE_FUNCTIONS_URL` can override the Functions base URL. These are public client settings; do not place provider secrets in them.

Shared AI requires the `OPENROUTER_API_KEY` Functions secret. `functions/src/index.ts` declares it using `defineSecret`. Deploying shared AI also requires the expected Functions deployment and the user's `ai_access_mode` set to `shared`.

## Build and hosting path

1. Vite compiles `src/` and copies `public/` into `dist/`.
2. `prerender.cjs` serves `dist/` locally and writes static HTML snapshots for its own configured route list.
3. Firebase Hosting publishes `dist/`, sets cross-origin headers, applies long cache headers to `/assets/**`, and rewrites unmatched paths to `/index.html`.
4. Firebase deploy configuration points to Firestore rules/indexes, Storage rules, and the `functions/` package. Functions predeploy runs its package build.

React routes and prerender routes are independent lists. Update and verify both when adding a route that needs prerendering. Static HTML/assets in `public/` are copied directly and do not need React prerendering.

## Firebase deployment

Use the Firebase CLI with the intended project selected and credentials configured. The configured full deployment is `firebase deploy`; targeted deploys may use the Firebase CLI's hosting, functions, firestore, or storage targets. Set Functions secrets through Firebase's secret configuration rather than client environment variables. Review the current `firebase.json` before deployment because it defines which resources are included.

## Important runtime caveats

- `src/main.tsx` both registers a service worker and schedules service-worker unregistration.
- Firebase Hosting's SPA rewrite does not make missing Cloud Functions endpoints exist.
- The Functions package currently exports only `chat`, `generateImage`, `audio`, and `drive`.
- Browser-local model support depends on hardware, browser capabilities, network availability for initial model assets, and storage.
