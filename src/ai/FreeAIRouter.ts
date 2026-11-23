/**
 * FreeAIRouter — the zero-setup unified client router.
 *
 * Goal: a brand-new visitor (no account, no key) can send a message and get
 * a real reply, and a visitor with free provider keys never dead-ends on a
 * single provider's rate limit.
 *
 * Route order:
 *   1. The signed-in account's BYOK key (unchanged behavior — always wins).
 *   2. Vault keys (device-local free-AI keys, src/lib/keyVault.ts) in
 *      free-tier priority order, SKIPPING providers that are inside a
 *      quota/auth cooldown (src/lib/quotaLedger.ts).
 *   3. The on-device WebGPU engine — used directly when loaded, or brought
 *      up on demand when the weights are already cached (the background
 *      bootstrap pre-caches the starter model, so most devices are covered).
 *      NEVER auto-starts a cold download — that requires explicit user
 *      consent via the ZeroSetupCard.
 *   4. An honest `needsSetup` result the chat UI turns into a recovery card
 *      (install the on-device model, or add a free key in 60 seconds).
 *
 * Failover: rate-limited (429) and rejected (401/403) keys are recorded in
 * the QuotaLedger and the NEXT route is tried within the same call, so one
 * provider's free-tier cap cannot take the conversation down.
 *
 * This router is consumed by streamCloudChat's keyless branches (the two
 * former dead-end error returns). Signed-in BYOK and shared-mode paths are
 * untouched.
 */
import { streamByokChat, getByokConfig, type ByokConfig, type ByokProvider } from "@/lib/byok";
import {
  orderedVaultEntries,
  vaultEntryAsByokConfig,
  type VaultEntry,
} from "@/lib/keyVault";
import {
  isProviderBlocked,
  recordProviderAuthFailure,
  recordProviderRateLimited,
  recordProviderSuccess,
} from "@/lib/quotaLedger";
import { fitMessagesToLocal, hasFrontierTrigger } from "@/lib/cloudChat";
import type { CloudChatMessage, CloudChatOptions, CloudChatResult } from "@/lib/cloudChat";

// ── Error classification ─────────────────────────────────────────────────

export type ProviderErrorClass = "rate_limited" | "auth" | "network" | "other";

/**
 * Classify a provider error string so the router can decide between
 * failover (rate limit / bad key / unreachable) and an honest stop
 * (anything else — surfacing a different provider's error would hide the
 * real problem). Returns null for "no error".
 */
export function classifyProviderError(error?: string): ProviderErrorClass | null {
  if (!error) return null;
  const e = error.toLowerCase();
  if (e.includes("429") || e.includes("rate limit") || e.includes("rate-limit") || e.includes("quota") || e.includes("too many requests")) {
    return "rate_limited";
  }
  if (e.includes("401") || e.includes("403") || e.includes("rejected") || e.includes("unauthorized") || e.includes("invalid") || e.includes("api key") || e.includes("authentication")) {
    return "auth";
  }
  if (e.includes("could not reach") || e.includes("network") || e.includes("failed to fetch") || e.includes("connection")) {
    return "network";
  }
  return "other";
}

// ── Setup guidance (the former dead-end, now actionable) ─────────────────

export const ZERO_SETUP_GUIDANCE =
  "ShadowTalk chats free — no card, no catch. Two instant options: " +
  "run the private on-device model right in this browser, or connect a free " +
  "Google AI Studio / Groq key in under a minute for frontier quality. " +
  "Pick an option below (Settings → AI Access works too).";

export interface FreeRoutePlan {
  /** Signed-in BYOK config (always tried first when present). */
  byok: ByokConfig | null;
  /** Vault routes in failover order, cooldown-blocked providers already removed. */
  vault: VaultEntry[];
}

/**
 * Pure route planner — exported for tests. Dedupes a vault provider that
 * repeats the signed-in BYOK provider with the SAME key (an identical retry
 * would just hit the same account twice), but keeps a vault entry when the
 * KEY differs (a second key on the same provider is a real failover route).
 */
export function planFreeRoutes(
  byok: ByokConfig | null,
  vaultEntries: VaultEntry[],
  blockedProviders: ReadonlySet<string> = new Set(),
): FreeRoutePlan {
  const vault = vaultEntries.filter((entry) => {
    if (blockedProviders.has(entry.provider)) return false;
    if (byok && entry.provider === byok.provider && entry.apiKey === byok.apiKey) return false;
    return true;
  });
  return { byok: byok ?? null, vault };
}

function collectRoutes(): FreeRoutePlan {
  const byok = getByokConfig();
  const blocked = new Set<string>();
  for (const entry of orderedVaultEntries()) {
    if (isProviderBlocked(entry.provider)) blocked.add(entry.provider);
  }
  return planFreeRoutes(byok, orderedVaultEntries(), blocked);
}

function routeSource(kind: "byok" | "vault"): CloudChatResult["source"] {
  return kind === "vault" ? "free" : "byok";
}

// ── On-device fallback helpers ────────────────────────────────────────────

/**
 * The cached on-device model that can be brought up WITHOUT a network
 * download (any tier whose weights are fully cached — not just the device
 * tier pick: a user who installed the Nano must not reload offline to
 * "model install failed" while the Nano sits on disk). Null = nothing
 * cached; a cold 880MB download must never start from inside a request —
 * the ZeroSetupCard asks for explicit consent.
 */
async function findAutoStartCachedModel(): Promise<string | null> {
  try {
    const { findCachedLocalModelId } = await import("@/services/modelManager");
    return await findCachedLocalModelId();
  } catch {
    return null;
  }
}

async function generateLocally(
  messages: CloudChatMessage[],
  opts: CloudChatOptions,
): Promise<CloudChatResult> {
  const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
  return localInferenceEngine.generate(fitMessagesToLocal(messages), opts);
}

// ── The router ────────────────────────────────────────────────────────────

/**
 * Keyless/free-tier chat routing. Every provider failure inside a cooldown
 * class fails over to the next route; partial answers (error WITH content)
 * are returned untouched — the caller marks them incomplete.
 */
export async function streamFreeChat(
  messages: CloudChatMessage[],
  opts: CloudChatOptions = {},
): Promise<CloudChatResult> {
  const plan = collectRoutes();
  let firstError: string | null = null;

  const cloudRoutes: Array<{ kind: "byok" | "vault"; provider: ByokProvider; cfg: ByokConfig }> = [];
  if (plan.byok?.apiKey) {
    cloudRoutes.push({ kind: "byok", provider: plan.byok.provider, cfg: plan.byok });
  }
  for (const entry of plan.vault) {
    cloudRoutes.push({ kind: "vault", provider: entry.provider, cfg: vaultEntryAsByokConfig(entry) });
  }

  for (const route of cloudRoutes) {
    let result: CloudChatResult;
    try {
      result = await streamByokChat(route.cfg, messages, opts);
    } catch (error) {
      // Caller-cancelled aborts must propagate untouched (matches the
      // direct BYOK path's contract).
      if ((error as Error)?.name === "AbortError") throw error;
      // Adapter-thrown network failure — try the next provider.
      firstError ??= (error as Error)?.message || `Could not reach ${route.provider}.`;
      continue;
    }

    const cls = classifyProviderError(result.error);
    if (!result.error) {
      recordProviderSuccess(route.provider);
      return { ...result, source: routeSource(route.kind), provider: route.provider };
    }
    firstError ??= result.error;
    if (result.content) {
      // Partial answer — failover would restart from zero; surface as-is.
      return { ...result, source: routeSource(route.kind), provider: route.provider };
    }
    if (cls === "rate_limited") {
      recordProviderRateLimited(route.provider);
      continue;
    }
    if (cls === "auth") {
      recordProviderAuthFailure(route.provider);
      continue;
    }
    if (cls === "network") continue;
    // "other" — an unknown provider failure is the honest thing to show.
    return { ...result, source: routeSource(route.kind), provider: route.provider };
  }

  // ── Cloud exhausted → on-device fallback for ordinary chat ──
  if (!hasFrontierTrigger(messages, opts)) {
    try {
      const { localInferenceEngine } = await import("@/offline/LocalInferenceEngine");
      if (localInferenceEngine.isLoaded()) {
        const local = await generateLocally(messages, opts);
        if (!local.error || local.content) return { ...local, source: "local" };
        firstError ??= local.error;
      } else {
        // Cache-gated, NOT network-gated: the only precondition for bringing
        // the engine up is that the weights are already on disk — a warm-up
        // is worker-spawn + shader compile + cache hits, none of which need a
        // network. The old `navigator.onLine !== false` gate dead-ended every
        // keyless OFFLINE visitor with "setup guidance" while a perfectly
        // good private model sat in the cache (the exact scenario offline
        // mode exists for). Online callers get the same behavior — the cache
        // check inside findAutoStartCachedModel() already prevents cold
        // downloads from inside a request.
        const cachedModelId = await findAutoStartCachedModel();
        if (cachedModelId) {
          const ok = await localInferenceEngine.initialize(undefined, cachedModelId);
          if (ok) {
            const local = await generateLocally(messages, opts);
            if (!local.error || local.content) return { ...local, source: "local" };
            firstError ??= local.error;
          }
        }
      }
    } catch {
      // Engine unavailable — fall through to the setup guidance.
    }
  }

  return {
    content: "",
    error: firstError ? `${ZERO_SETUP_GUIDANCE} (Last provider error: ${firstError})` : ZERO_SETUP_GUIDANCE,
    source: "free",
    needsSetup: true,
  };
}
