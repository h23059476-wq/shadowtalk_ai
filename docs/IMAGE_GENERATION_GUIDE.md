# Image & Visual Generation — Setup Guide

This guide explains how image generation and visual generation work in ShadowTalk AI, what they require, and how to fix the most common failures. It reflects the code as of the unified image pipeline (`src/lib/imageGen.ts`).

## How image generation resolves

Every image request in chat goes through one pipeline with a strict resolution order:

1. **BYOK first (recommended)** — if the signed-in user has an API key from an **image-capable provider**, the request goes browser→provider with their own key:
   - **OpenAI** — `gpt-image-1` (`/v1/images/generations`, or `/v1/images/edits` when an image is attached)
   - **OpenRouter** — `google/gemini-2.5-flash-image` (`/api/v1/images`)
   - **Google Gemini** — `gemini-2.5-flash-image` (native `generateContent`, used automatically regardless of the selected chat model)
2. **Shared fallback** — signed-in users whose AI access mode is **shared** and who have no image-capable key are served by the platform-funded `generateImage` Firebase Function (OpenRouter key pool, `google/gemini-2.5-flash-image`). It counts toward the **100 requests/day** shared quota (chat + images combined, resets 00:00 UTC).
3. **Actionable error** — if neither path is available, the chat shows setup instructions instead of a failed tool message.

The single source of truth for image-capable providers is `IMAGE_CAPABLE_PROVIDERS` in `src/lib/cloudImage.ts`. All other providers (Groq, Anthropic, DeepSeek, Mistral, xAI, Perplexity, etc.) can power **chat and vision** but not image generation.

## Recommended setup: a free Gemini key

One free Google AI Studio key unlocks chat, image generation and diagrams:

1. Go to [Google AI Studio → API keys](https://aistudio.google.com/app/apikey).
2. Create an API key (free tier available).
3. In ShadowTalk, open **Settings → Personalization → BYOK**.
4. Select **Google Gemini** as the provider, paste the key, click **Save**.

The badge "Image generation supported" appears on image-capable providers, and the Generate Image mode shows a "key needed" hint when no path is available.

## Visual & diagram generation

Visualizations (charts, KPI dashboards, comparison matrices, timelines, flowcharts) and conceptual diagrams (mindmaps, roadmaps, decision trees, architectures) have **different requirements from image generation**:

- **Deterministic visualizations** (including live market data) need no AI key at all.
- **AI-assisted conceptual diagrams** need a *chat* key — any provider works, because they call the normal chat completion path (`streamCloudChat`), not an image endpoint.
- **Gap-driven research** inside conceptual diagrams additionally requires an **OpenRouter or Perplexity** key (web search tools).

If diagrams fail with "No API key set", add *any* provider key in **Settings → Personalization → BYOK** — an image model is not required.

## Using it

- Slash command: `/image a red fox in the snow`
- Natural language: "generate an image of …", "draw …"
- Image mode: select **Generate Image** in the mode selector
- Image editing: attach an image and describe the edit ("make this black and white", "remove the background")

Images are watermarked on both paths. Shared-mode responses are labeled so users can see when the shared pool served the request.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| "key needed" hint on Generate Image | No image-capable key, not in shared mode | Add an OpenAI/OpenRouter/Gemini key, or switch to shared AI mode |
| "Your … API key was rejected (401/403)" | Invalid or revoked key | Re-check the key in Settings → Personalization → BYOK |
| "rate limit or quota reached (429)" | Provider quota exhausted | Wait, upgrade the provider plan, or switch provider |
| "refused this prompt under its content policy" | Provider safety block | Rephrase the prompt |
| "Could not reach OpenAI (network or DNS failure)" | CORS, ad-blocker, or corporate proxy blocking the provider host | Allowlist `api.openai.com` / `openrouter.ai` / `generativelanguage.googleapis.com`; shared-mode users can retry — the server-side path may still work |
| "Daily AI limit reached (100 requests)" | Shared-mode quota exhausted | Wait for the 00:00 UTC reset or add a BYOK key |
| "This account uses BYOK" from shared image generation | Access mode is BYOK but no image-capable key | Add an image-capable key, or switch access mode to shared |
| Diagrams say "The model call failed: No API key set" | No chat key configured | Add any provider key (image model not needed) |

## Architecture reference

| Module | Role |
| --- | --- |
| `src/lib/cloudImage.ts` | BYOK image generation (browser→provider), image-capable provider list, error mapping, watermark entry |
| `src/lib/sharedImage.ts` | Client for the shared `generateImage` Function (signed-in shared-mode users only) |
| `src/lib/imageGen.ts` | Unified entry: BYOK first, explicit gated fallback, `isImageGenerationReady()` for UI gating |
| `functions/src/index.ts` (`generateImage`) | Server-side shared image generation: auth, shared-mode check, daily quota, key-pool retries |
| `src/components/chat/ModeSelector.tsx` | Proactive "key needed" hint on the Generate Image mode |
| `docs/architecture/ai-and-request-flows.md` | Full request-path documentation |
