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
- Intelligent workspace: local-first document ingestion and retrieval (`src/lib/rag/`), dynamic context budgeting with non-destructive compaction, and the MCP bridge client (`src/lib/mcpBridge/`) paired with the zero-dependency Node companion in `companion/`.
- LIVE voice mode: canvas avatar (`src/components/chat/LiveAvatar.tsx`), echo-cancelled mic metering with hands-free barge-in (`src/hooks/useMicLevel.ts`), streaming sentence speech pipeline and rhythm engine (`src/lib/speechChunking.ts`) in `src/components/chat/LiveVoiceMode.tsx`.
- Deterministic OAuth return handoff for Google redirect sign-in (lands on the workspace instead of looping).
- Memory reflection with on-device embeddings (production-honest path replacing the earlier non-functional flow).
- Public content and SEO assets, including static files under `public/`.

## Demo, shell, or unverified integrations

- `audio` Function returns a fixed sample audio URL after a delay; it is not provider-backed voice generation.
- `drive` Function returns mock file records/content; it is not a Google Drive connector.
- Some pages are explicit coming-soon shells or aliases.
- Hooks invoke Function names not exported by this repository's Functions package. Their availability depends on external deployments not represented here.
- `supabase/` and `src/integrations/supabase/` are retained in the tree but Firebase is the backend constructed by the app-facing client.
- PWA: the service worker registration was repaired — the earlier entry-level unregistration was removed after it broke offline caching and install; the manifest's display, start_url, and scope satisfy Chrome's install criteria. Verify runtime behavior on target browsers before relying on offline caching.

## How to verify a feature before changing or documenting it

1. Find the route in `src/App.tsx` and identify the actual page component.
2. Trace page actions into hooks and `src/lib/` services.
3. Follow data calls through `backend` into the Firebase adapter and rules.
4. For HTTPS requests, compare the invoked endpoint name with exports in `functions/src/index.ts` and any configured external deployment.
5. Check whether the UI marks the feature as demo, preview, or coming soon.
