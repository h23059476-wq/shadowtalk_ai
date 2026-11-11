# ShadowTalk AI

ShadowTalk is a React and TypeScript web application for AI chat and related personal, developer, and product workflows. Firebase is the active application backend. This guide describes the implementation in this repository as inspected on 2026-10-29; source code and deployment configuration remain authoritative when behavior changes.

## Start here

- [Architecture and runtime map](docs/architecture/README.md)
- [AI request paths](docs/architecture/ai-and-request-flows.md)
- [Data and security boundaries](docs/architecture/data-and-security.md)
- [Feature and integration inventory](docs/architecture/feature-inventory.md)
- [Build, configuration, and deployment](docs/operations.md)

## Stack

- React 18, TypeScript, Vite, React Router, TanStack Query
- Firebase Authentication, Cloud Firestore, Cloud Storage, and Firebase Functions v2
- AI request paths for shared OpenRouter access, user-supplied provider keys, and WebLLM local inference
- Tailwind CSS, Radix UI, Framer Motion, and feature-specific tools such as Monaco and WebContainer

## Local development

Use Node.js 20 or newer. Install dependencies and run the Vite server:

```sh
npm ci
npm run dev
```

Vite uses port 8080 by default. Firebase web configuration has source defaults; local overrides can be placed in `.env` using the keys documented in [`env.example`](env.example). Web configuration is public client configuration and must not contain provider secrets.

Build and lint commands are `npm run build` and `npm run lint`. The separate Functions package is built with `npm ci --prefix functions` followed by `npm --prefix functions run build`. See [operations](docs/operations.md) for boundaries and deployment details.

## Repository map

```text
src/App.tsx                       providers and client-side routes
src/pages/                        route-level screens
src/components/                   shared and feature UI
src/hooks/                        reusable feature and data hooks
src/contexts/                     cross-app React state
src/integrations/firebase/        Firebase SDK adapters
src/integrations/local/client.ts  app-facing Firebase compatibility client
src/lib/                          feature services and orchestration
src/ai/ and src/offline/          provider selection and browser inference
functions/src/index.ts            deployed Firebase HTTPS Functions
firestore.rules                   Firestore authorization
storage.rules                     Cloud Storage authorization
firebase.json                     Hosting, rules/indexes, Functions predeploy
public/                           static assets and directly served content
```

There are Supabase-named compatibility and legacy files in the repository. Their presence does not make Supabase the active backend; follow actual imports and deployment configuration.
