# AI request paths

## Entry points

The main chat page is `src/pages/ChatbotPage.tsx`. It uses `src/lib/cloudChat.ts` for streaming cloud chat. Other features also call this service, so the same account mode can affect assistant features outside the primary chat screen. Provider abstractions live in `src/ai/`; local inference lives in `src/offline/`.

## Access modes

`src/lib/aiAccessMode.ts` supports `shared` and `byok`. It caches the selected mode in localStorage under a UID-specific key and reads/writes `user_settings` in Firestore. If no cached or stored mode is available, the cloud chat helper returns an onboarding/configuration error rather than silently choosing a provider.

### Shared mode

1. `cloudChat.ts` obtains a Firebase ID token and POSTs to the configured Functions `/chat` URL.
2. `functions/src/index.ts` verifies the token, checks that `user_settings` selects shared mode, validates the message array, and transactionally reserves one daily request.
3. The Function sends the request to OpenRouter using `OPENROUTER_API_KEY`, streaming SSE back to the browser.
4. The daily limit is 100 requests per UID per UTC date. Image generation uses the same counter. Failed requests can release the reservation before upstream streaming begins.

The current source declares `openrouter/free` as the shared chat model and `google/gemini-2.5-flash-image` for image generation. These are implementation defaults, not a guarantee of provider availability.

### BYOK mode

`src/lib/byok.ts` stores a provider key and model choice in browser localStorage scoped to the signed-in UID. Requests go from the browser directly to the selected provider; the Firebase shared-AI quota does not apply. OpenAI and OpenRouter image generation are supported by the BYOK path; text and vision depend on the provider/model. Browser storage is not a hardware-backed secret store.

### Local inference

`src/offline/LocalInferenceEngine.ts` starts a module worker and uses WebLLM to load a configured model. It streams generated tokens locally. Availability depends on model download/cache state, browser support, and device capability. `AIProviderRouter` chooses local when explicitly requested or when `navigator.onLine` is false and the local provider reports available. A separate scheduled service-worker unregistration in `src/main.tsx` means PWA caching should not be assumed to work as intended.

## Function inventory and provider limits

The current Functions package exports four HTTPS endpoints:

| Export | Behavior |
| --- | --- |
| `chat` | Authenticated shared-mode OpenRouter chat; SSE response; shared daily quota |
| `generateImage` | Authenticated shared-mode image request; shared daily quota |
| `audio` | Authenticated demo response using a fixed sample audio URL |
| `drive` | Authenticated mock list/get responses; no real Google Drive connection |

The client adapter can invoke arbitrary endpoint names, but this package only exports the functions above. Several hooks invoke names such as `track-location`, `website-security-scan`, `firecrawl-scrape`, `email-sync`, and `calendar-sync`; their implementation/deployment was not found among these exports. Treat those integrations as unverified until an external deployment or source package is identified.

## Data path and privacy implications

Shared-mode prompts pass through the Firebase Function to OpenRouter. BYOK prompts go directly from the browser to the chosen provider. Local-mode inference runs in the browser. Chat persistence is separately managed by chat hooks and Firestore. Private mode encrypts content before storage when enabled, but should not be conflated with all AI requests automatically being local or end-to-end encrypted. See [data and security boundaries](data-and-security.md).
