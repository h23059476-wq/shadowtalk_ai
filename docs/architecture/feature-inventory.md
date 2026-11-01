# Feature and integration inventory

This inventory distinguishes routes and source modules from verified backend behavior. A route or UI component alone does not prove an integration is operational.

## Product routes

The canonical route declarations are in `src/App.tsx`. Major groups include:

- Workspace/account: `/chatbot`, `/profile`, `/settings`, `/sessions`, `/auth`.
- Memory/identity: `/shadow-memory`, `/knowledge-graph`, `/shadow-twin`, `/t/:username`.
- Work tools: `/research`, `/ide`, `/computer`, `/agentic-ai-workspace`, `/personal-llm`, `/templates`.
- Product/company: `/home`, `/about`, `/founder`, `/pricing`, `/developers`, `/enterprise`, `/downloads`.
- Support/legal: `/help`, `/faq`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/gdpr`.
- Admin/analytics: `/admin`, `/analytics`.

Some aliases redirect (for example `/workspace` to `/chatbot`, `/marketplace` to `/chatbot`); some product routes point to `ComingSoonPage`. Check the route element in source before describing a route as a finished feature. Static SEO pages under `public/` are separate from React routes.

## Implemented paths visible in source

- Firebase auth, Firestore-backed data access, Storage adapter, and Firestore listeners.
- Shared-mode chat and image generation Functions with authentication and daily quota enforcement.
- BYOK streaming requests from browser to supported provider APIs.
- WebLLM browser inference when the model/device path is available.
- Client-side code IDE and WebContainer Computer Mode modules, subject to browser isolation requirements.
- Chat private mode that encrypts stored message/title content when enabled.
- Public content and SEO assets, including static files under `public/`.

## Demo, shell, or unverified integrations

- `audio` Function returns a fixed sample audio URL after a delay; it is not provider-backed voice generation.
- `drive` Function returns mock file records/content; it is not a Google Drive connector.
- Some pages are explicit coming-soon shells or aliases.
- Hooks invoke Function names not exported by this repository's Functions package. Their availability depends on external deployments not represented here.
- `supabase/` and `src/integrations/supabase/` are retained in the tree but Firebase is the backend constructed by the app-facing client.
- PWA setup is internally inconsistent: the entry registers a service worker and later schedules unregistration. Verify runtime behavior before claiming offline caching is reliable.

## How to verify a feature before changing or documenting it

1. Find the route in `src/App.tsx` and identify the actual page component.
2. Trace page actions into hooks and `src/lib/` services.
3. Follow data calls through `backend` into the Firebase adapter and rules.
4. For HTTPS requests, compare the invoked endpoint name with exports in `functions/src/index.ts` and any configured external deployment.
5. Check whether the UI marks the feature as demo, preview, or coming soon.
