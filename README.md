# ShadowTalk AI

ShadowTalk is a React and TypeScript web application centered on an AI chat workspace. The repository includes account and settings pages, shared answers, public Shadow Twin profiles, product and support pages, and supporting AI integrations. Firebase is the primary backend for the app-facing client.

**Production:** [Open the workspace](https://shadowtalk-ai-7a513.web.app/chatbot) · [Visit the home page](https://shadowtalk-ai-7a513.web.app/home)

> This README describes the implementation and configuration in this repository. A route or integration in source code does not necessarily mean that its external services are configured or that the feature is enabled in the deployed environment. Check the linked source and deployment configuration for current behavior.

## At a glance

- **Web app:** React 18, TypeScript, Vite, React Router 6, TanStack Query, Zustand, Tailwind CSS, and Radix UI.
- **Identity and data:** Firebase Authentication, Cloud Firestore, and Cloud Storage. An app-facing adapter provides a Supabase-style query interface over Firestore; it is not a PostgreSQL service.
- **AI:** Shared OpenRouter-backed chat and image-generation Functions, browser-based provider integrations, and WebLLM/WebGPU local-inference code paths. Provider availability depends on credentials, model support, browser capabilities, and deployment configuration.
- **Hosting:** Firebase Hosting serves the Vite `dist/` output and rewrites application routes to the SPA entry point. The build optionally prerenders selected routes with Puppeteer.
- **Other integrations:** Supabase client and Edge Function sources remain in the repository, but Firebase is the primary backend used by the app-facing client.

See [Architecture](./docs/architecture/README.md) for additional implementation detail and [docs](./docs/README.md) for security, authentication, deployment, and other project documentation.

## Get started

Use Node.js 20. Install the root dependencies and run the Vite development server:

```bash
git clone https://github.com/u722365-lgtm/ShadowTalk-Production.git
cd ShadowTalk-Production
npm ci
npm run dev
```

Open `http://localhost:8080`.

The repository includes default Firebase web configuration for its deployed project. To override it locally, copy [`env.example`](./env.example) to `.env` and set the needed `VITE_FIREBASE_*` values. Set `VITE_FIREBASE_FUNCTIONS_URL` if you need a custom Functions base URL. These are client-side settings, not secrets: Vite embeds `VITE_*` values in browser assets. **Never place provider API keys, service-account credentials, or other private credentials in `VITE_*` variables.**

## AI configuration and limitations

The shared chat and image endpoints require an authenticated Firebase user and the account's shared AI access mode. The Functions source enforces a combined limit of 100 shared AI requests per user per UTC day. Configure the provider credential as a Firebase Functions secret, not in the web app environment:

```bash
firebase functions:secrets:set OPENROUTER_API_KEY
firebase deploy --only functions
```

The shared endpoints use OpenRouter. Browser-based provider-key (BYOK) and local-inference paths are also present; the supported provider/model combinations and local model availability vary by feature and device. Check the relevant implementation and [architecture notes](./docs/architecture/README.md) before relying on a particular path.

The `audio` and `drive` HTTPS Functions currently return `501 Not Implemented`; they are not working provider-backed integrations. Do not treat their presence in the source as an available feature. Image generation through the shared endpoint and BYOK image generation have different request paths and provider support.

## Application routes

Routes are declared in [`src/App.tsx`](./src/App.tsx). Important currently rendered pages include:

| Area | Routes |
| --- | --- |
| Home and authentication | `/home`, `/auth`, `/auth/action` |
| Workspace and account | `/chatbot`, `/profile`, `/settings` |
| Shadow Twin and shared content | `/shadow-twin`, `/t/:username`, `/s/:slug` |
| Product and support | `/about`, `/pricing`, `/founder`, `/zain-ahmed`, `/contact`, `/faq`, `/blog`, `/benchmarks`, `/docs`, `/changelog`, `/status` |
| Legal | `/gdpr`, `/cookies`, `/terms`, `/privacy` |
| Administration | `/admin`, `/admin/intelligence` |

Some legacy or planned paths redirect to another page rather than displaying a dedicated feature. For example, `/research`, `/computer`, `/marketplace`, and `/shadow-memory` currently redirect to `/chatbot`; `/help` redirects to `/docs`. The route table in `src/App.tsx` is authoritative.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 8080 |
| `npm run build` | Create the Vite production build, then attempt prerendering |
| `npm run build:dev` | Build with Vite development mode |
| `npm run preview` | Preview the built client locally |
| `npm run typecheck` | Type-check the web app |
| `npm test` | Run the Vitest suite once |
| `npm run lint` | Run ESLint |
| `npm ci --prefix functions` | Install Cloud Functions dependencies |
| `npm --prefix functions run build` | Compile/type-check Cloud Functions |

`npm run build` invokes [`prerender.cjs`](./prerender.cjs) after Vite. Its current route list is maintained separately from React Router (`/`, `/founder`, `/about`, `/pricing`, `/chatbot`, `/docs`, `/faq`, `/blog`, `/changelog`, `/security`, `/benchmarks`, `/contact`, `/help`). Puppeteer prerendering is optional and may be skipped when Puppeteer or a usable Chromium environment is unavailable. Update both the router and prerender list when changing prerendered routes.

Run relevant checks before submitting changes:

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm --prefix functions run build
```

The web typecheck/build and the separate Functions build validate different parts of the project. A successful build alone does not establish that all tests, lint checks, external integrations, or deployed services are working.

## Firebase backend and deployment

[`firebase.json`](./firebase.json) configures Firebase Hosting, Firestore rules and indexes, Storage rules, and a Functions predeploy build. The Functions package targets Node.js 20. Firebase Hosting serves `dist/`, applies cross-origin isolation headers used by browser features, and rewrites unmatched paths to `index.html`.

The current Functions source exports:

| HTTPS function | Repository behavior |
| --- | --- |
| `chat` | Authenticated shared AI chat through OpenRouter; supports streaming and records usage |
| `generateImage` | Authenticated shared image generation through OpenRouter |
| `deleteAccount` | Requires a recent sign-in, removes the account's matching data and receipt files, then deletes the Firebase Auth identity |
| `audio` | Returns `501 Not Implemented` |
| `drive` | Returns `501 Not Implemented` |

To build Functions locally:

```bash
npm ci --prefix functions
npm --prefix functions run build
```

After installing and authenticating the Firebase CLI, verifying the selected Firebase project, and configuring required server-side credentials, deploy with:

```bash
firebase deploy
```

Deploy only the relevant target when appropriate (for example, `firebase deploy --only functions`). Review [`firestore.rules`](./firestore.rules), [`firestore.indexes.json`](./firestore.indexes.json), and [`storage.rules`](./storage.rules) whenever changing data access or deployment behavior. Do not assume repository configuration alone matches the currently deployed project.

## Repository layout

```text
src/
  components/          Shared UI and feature components
  contexts/            App-wide React contexts
  hooks/               Reusable hooks
  integrations/
    firebase/          Firebase app and service integrations
    local/             App-facing backend compatibility client
    supabase/          Separate Supabase client and generated types
  lib/                 Feature logic and service modules
  offline/             Local inference and device-capability code
  pages/               Route-level React pages
functions/src/         Firebase Cloud Functions
supabase/functions/    Supabase Edge Function sources retained in the repo
public/                Static assets and published content
prerender.cjs          Optional Puppeteer route prerendering
 docs/                 Architecture, security, deployment, and product docs
```

For data-access, AI request-flow, hosting, and security details, see [Architecture](./docs/architecture/README.md). Treat source code and deployment configuration as authoritative, especially where older design documents describe routes or features that may have since changed.
