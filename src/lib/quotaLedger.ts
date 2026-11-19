/**
 * QuotaLedger — device-local per-provider usage ledger + rate-limit cooldowns.
 *
 * The free-AI router (src/ai/FreeAIRouter.ts) consults this ledger so a
 * provider that just answered 429 (free-tier per-minute cap) is SKIPPED for a
 * cool-down window instead of being retried — and re-failing — on every
 * message. Auth failures (a rejected key) cool down for longer: retrying a
 * bad key sooner only burns the next provider's quota window.
 *
 * Request counters are informational (a Settings surface can show "Gemini:
 * 14 requests today"); the cooldowns are the behavioral part.
 *
 * Storage: localStorage only, device-local, never synced. Corrupted or
 * missing storage degrades to "nothing blocked" — the ledger must never
 * break chat.
 */

const LEDGER_STORAGE_KEY = "shadowtalk.quota-ledger.v1";

/** After a 429 the provider is skipped for this long (free tiers reset per minute). */
export const RATE_LIMIT_COOLDOWN_MS = 60_000;

/** A rejected (401/403) key is skipped for longer — it will not fix itself in a minute. */
export const AUTH_FAILURE_COOLDOWN_MS = 10 * 60_000;

export interface ProviderLedgerEntry {
  /** Requests that went through this provider today (informational). */
  requests: number;
  /** Epoch ms of the most recent 429 — blocked until +RATE_LIMIT_COOLDOWN_MS. */
  rateLimitedAt?: number;
  /** Epoch ms of the most recent auth failure — blocked until +AUTH_FAILURE_COOLDOWN_MS. */
  authFailedAt?: number;
}

export interface QuotaLedgerState {
  /** ISO date (YYYY-MM-DD) the request counters belong to. */
  day: string;
  providers: Record<string, ProviderLedgerEntry>;
}

function todayKey(now: Date): string {
  try {
    return now.toISOString().slice(0, 10);
  } catch {
    return "1970-01-01";
  }
}

function readState(now: Date = new Date()): QuotaLedgerState {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QuotaLedgerState;
      if (parsed && typeof parsed === "object" && parsed.providers && typeof parsed.providers === "object") {
        // New day → reset the request counters. Cooldowns are epoch-based and
        // expire on their own, so they survive the rollover: a 429 at 23:59
        // must still block until 00:00:59.
        if (parsed.day !== todayKey(now)) {
          const carried: Record<string, ProviderLedgerEntry> = {};
          for (const [id, e] of Object.entries(parsed.providers)) {
            if (e && typeof e === "object" && (e.rateLimitedAt != null || e.authFailedAt != null)) {
              carried[id] = { requests: 0, rateLimitedAt: e.rateLimitedAt, authFailedAt: e.authFailedAt };
            }
          }
          return { day: todayKey(now), providers: carried };
        }
        return parsed;
      }
    }
  } catch {
    // corrupted storage → start fresh
  }
  return { day: todayKey(now), providers: {} };
}

function writeState(state: QuotaLedgerState): void {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private browsing) — the ledger is optional.
  }
}

function entryFor(state: QuotaLedgerState, providerId: string): ProviderLedgerEntry {
  const existing = state.providers[providerId];
  return existing && typeof existing === "object"
    ? { requests: Number(existing.requests) || 0 }
    : { requests: 0 };
}

/** Roll the counters over when the stored day is no longer today. */
export function resetLedgerForNewDay(now: Date = new Date()): void {
  const state = readState(now);
  if (state.day !== todayKey(now)) {
    writeState({ day: todayKey(now), providers: {} });
  }
}

export function recordProviderSuccess(providerId: string, now: Date = new Date()): void {
  const state = readState(now);
  const entry = entryFor(state, providerId);
  entry.requests += 1;
  // A success also clears any stale cooldown markers from a previous day.
  entry.rateLimitedAt = undefined;
  entry.authFailedAt = undefined;
  state.providers[providerId] = entry;
  writeState(state);
}

export function recordProviderRateLimited(providerId: string, now: Date = new Date()): void {
  const state = readState(now);
  const entry = entryFor(state, providerId);
  entry.rateLimitedAt = now.getTime();
  state.providers[providerId] = entry;
  writeState(state);
}

export function recordProviderAuthFailure(providerId: string, now: Date = new Date()): void {
  const state = readState(now);
  const entry = entryFor(state, providerId);
  entry.authFailedAt = now.getTime();
  state.providers[providerId] = entry;
  writeState(state);
}

/**
 * True while the provider should be skipped by the router: inside the
 * cooldown window after a 429 or an auth failure.
 */
export function isProviderBlocked(providerId: string, now: Date = new Date()): boolean {
  const state = readState(now);
  const entry = state.providers[providerId];
  if (!entry) return false;
  const t = now.getTime();
  if (typeof entry.authFailedAt === "number" && t - entry.authFailedAt < AUTH_FAILURE_COOLDOWN_MS) return true;
  if (typeof entry.rateLimitedAt === "number" && t - entry.rateLimitedAt < RATE_LIMIT_COOLDOWN_MS) return true;
  return false;
}

/** Read-only entry for UI surfaces (null when the provider was never used). */
export function getLedgerEntry(providerId: string, now: Date = new Date()): ProviderLedgerEntry | null {
  const state = readState(now);
  const entry = state.providers[providerId];
  return entry ? { ...entry } : null;
}

/** Deep copy of the whole ledger (UI/debug). */
export function quotaSnapshot(now: Date = new Date()): QuotaLedgerState {
  const state = readState(now);
  return { day: state.day, providers: JSON.parse(JSON.stringify(state.providers)) as QuotaLedgerState["providers"] };
}

/** Test hook — wipes the persisted ledger. */
export function __resetQuotaLedgerForTests(): void {
  try {
    localStorage.removeItem(LEDGER_STORAGE_KEY);
  } catch {
    // ignore
  }
}
