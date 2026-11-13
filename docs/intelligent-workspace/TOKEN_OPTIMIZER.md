# Dynamic Token Optimizer

> Batch 1 of the Intelligent Workspace initiative. Architecture context: `ARCHITECTURE.md`.

## Context budgeting (`modelRegistry.ts`, `contextBudget.ts`)

- Per-provider context windows + output caps for all 16 BYOK providers + the shared gateway, with known-model overrides (gpt-4o 128K, Claude 200K, Gemini Pro 2M, DeepSeek 64K, Llama-3.x 131K, …) and CONSERVATIVE round-down defaults for unknown models (32K for aggregators whose model lineup is unknowable).
- `availableForInput = contextWindow − reservedOutput − safetyMargin(5%, cap 1024)`. The old hard-coded `maxTokens: 8192` is now clamped to the provider's documented output limit.
- Estimation: documented CJK-aware heuristic (`tokens ≈ cjk×1 + other/4`) — chars/4 overcounts zh/ja 4×, and ShadowTalk ships 11 UI languages. Everything estimated is labeled estimated.

## Compaction (`compaction.ts`) — non-destructive

- Trigger: estimated history + fixed prefix exceeds budget.
- Protected classes (never compacted, regardless of age): decisions, requirements/constraints, unfinished tasks, unresolved questions, file/research references (marker-based classifier, `importance.ts`), plus a verbatim recent tail (14 messages — the old `slice(-14)` window, preserved as the floor).
- Unprotected runs become ONE extractive summary per run (locally computed, zero provider calls — compaction never creates cost). Summary blocks carry `sourceMessageIds` for traceability.
- The original conversation is NEVER mutated: compaction reshapes only the outgoing request; `outgoing` entries reference the original message objects by index (rich array content like vision images passes through untouched).
- Summaries persist to Firestore `conversation_compactions` (user-owned whitelist + emulator test) for inspection/recovery.

## Provider caching — documented mechanisms only

- Anthropic: explicit `cache_control` breakpoints on the system prompt + last message block, applied only when the estimated prefix ≥ 1,024 tokens (Anthropic's caching minimum). ≤ 4 breakpoints rule respected (we use 2).
- OpenAI/DeepSeek/Groq/OpenRouter/etc.: automatic caching — nothing sent; reported ONLY when the provider returns cached-token counts (`prompt_tokens_details.cached_tokens`, DeepSeek `prompt_cache_hit_tokens`, Anthropic `cache_read_input_tokens`).
- No fabricated savings. Ever.

## Usage + telemetry (`usage.ts`, metadata)

- OpenAI-compatible streams: `stream_options.include_usage` requested ONLY from the 12 documented providers (others get no extra fields — unknown params can hard-reject and break chat). Anthropic `message_start`/`message_delta` parsed.
- Measured usage wins over estimation; `TokenTelemetry` (input/output, measured/est, cached, compaction stats) persists in message metadata through the existing encrypt-or-null gate.
- The hard-coded `"gpt-4o-mini"` cost attribution is gone — the tracker uses the model that actually served the request.
- UI: `TokenTelemetryBadge` popover (chat toolbar row) shows last-request input/output, measured/est labels, cached tokens when reported, compacted ranges, and cumulative BYOK spend.
