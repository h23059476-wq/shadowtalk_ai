/**
 * KeyVault — device-local, multi-provider free-AI key storage.
 *
 * Zero-setup chat must work for SIGNED-OUT visitors, so the vault is
 * intentionally NOT uid-scoped (unlike the per-account BYOK config, which
 * keys off Firebase uid): keys live in this browser only, are never
 * uploaded, and are never synced. The FreeAIRouter consults the signed-in
 * BYOK config first, then falls through to vault keys.
 *
 * One key per provider — re-adding a provider replaces its key (the newest
 * paste wins). The vault holds at most VAULT_MAX_ENTRIES providers; the
 * oldest addition is evicted when full.
 */
import type { ByokConfig, ByokProvider } from "@/lib/byok";

const VAULT_STORAGE_KEY = "shadowtalk.key-vault.v1";

/** Hard cap — the priority catalog has 6 providers; keep them all fittable. */
export const VAULT_MAX_ENTRIES = 6;

export interface VaultEntry {
  provider: ByokProvider;
  apiKey: string;
  model?: string;
  addedAt: string;
}

export interface FreeProviderPreset {
  provider: ByokProvider;
  label: string;
  /** Where the user creates a free key. */
  signupUrl: string;
  /** Honest one-line description of the free tier (as of late 2025). */
  freeTier: string;
  defaultModel: string;
  keyHint: string;
}

/**
 * Free-tier friendly providers, in failover priority order:
 *  - gemini: free API key from Google AI Studio, frontier-quality flash model.
 *  - groq: free key, fastest tokens/sec for everyday chat.
 *  - openrouter: free key, pool of `:free` community models.
 *  - cerebras / mistral: free tiers with generous limits.
 *  - openai: paid-only for most models — lowest priority, still allowed.
 */
export const FREE_PROVIDER_PRIORITY: ByokProvider[] = [
  "gemini",
  "groq",
  "openrouter",
  "cerebras",
  "mistral",
  "openai",
];

export const FREE_AI_PRESETS: FreeProviderPreset[] = [
  {
    provider: "gemini",
    label: "Google AI Studio",
    signupUrl: "https://aistudio.google.com/app/apikey",
    freeTier: "Free Gemini key — generous daily quota, frontier-quality answers.",
    defaultModel: "gemini-2.0-flash",
    keyHint: "AIza...",
  },
  {
    provider: "groq",
    label: "Groq",
    signupUrl: "https://console.groq.com/keys",
    freeTier: "Free key — the fastest free chat (Llama 3.3 70B), per-minute caps.",
    defaultModel: "llama-3.3-70b-versatile",
    keyHint: "gsk_...",
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    signupUrl: "https://openrouter.ai/keys",
    freeTier: "Free key — unlocks a pool of community models tagged :free.",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    keyHint: "sk-or-...",
  },
  {
    provider: "cerebras",
    label: "Cerebras",
    signupUrl: "https://cloud.cerebras.ai",
    freeTier: "Free key — very fast Llama inference with daily free limits.",
    defaultModel: "llama-3.3-70b",
    keyHint: "csk-...",
  },
  {
    provider: "mistral",
    label: "Mistral AI",
    signupUrl: "https://console.mistral.ai/api-keys",
    freeTier: "Free experimental tier — solid European models.",
    defaultModel: "mistral-small-latest",
    keyHint: "...",
  },
  {
    provider: "openai",
    label: "OpenAI",
    signupUrl: "https://platform.openai.com/api-keys",
    freeTier: "Paid-only for most models — use a free provider above if possible.",
    defaultModel: "gpt-4o-mini",
    keyHint: "sk-...",
  },
];

function readVault(): VaultEntry[] {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is VaultEntry =>
        e && typeof e === "object" &&
        typeof e.provider === "string" &&
        typeof e.apiKey === "string" &&
        e.apiKey.length > 0,
    );
  } catch {
    return [];
  }
}

function writeVault(entries: VaultEntry[]): void {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — the vault is optional; chat still works via BYOK/shared.
  }
}

/** All stored vault entries in insertion order. */
export function listVaultEntries(): VaultEntry[] {
  return readVault().map((e) => ({ ...e }));
}

export function getVaultEntry(provider: ByokProvider): VaultEntry | null {
  const found = readVault().find((e) => e.provider === provider);
  return found ? { ...found } : null;
}

export function hasAnyVaultKey(): boolean {
  return readVault().length > 0;
}

/**
 * Validate a key the user pasted: non-empty, sane length, no whitespace.
 * Returns an error message, or null when the key is acceptable.
 */
export function validateVaultKey(apiKey: string): string | null {
  const trimmed = (apiKey || "").trim();
  if (!trimmed) return "Paste the API key from your provider's dashboard.";
  if (/\s/.test(trimmed)) return "API keys cannot contain spaces — re-copy the full key.";
  if (trimmed.length < 8 || trimmed.length > 512) return "That does not look like an API key — check for a partial paste.";
  return null;
}

/**
 * Store (or replace) the key for one provider. Throws on invalid input so
 * the calling UI can show the reason; storage write failures are swallowed
 * (vault optional).
 */
export function saveVaultKey(provider: ByokProvider, apiKey: string, model?: string): VaultEntry {
  const invalid = validateVaultKey(apiKey);
  if (invalid) throw new Error(invalid);
  const trimmedModel = (model || "").trim();
  const entries = readVault().filter((e) => e.provider !== provider);
  entries.push({
    provider,
    apiKey: apiKey.trim(),
    ...(trimmedModel ? { model: trimmedModel } : {}),
    addedAt: new Date().toISOString(),
  });
  while (entries.length > VAULT_MAX_ENTRIES) {
    entries.shift(); // evict oldest addition
  }
  writeVault(entries);
  const saved = entries.find((e) => e.provider === provider);
  return { ...saved! };
}

export function removeVaultKey(provider: ByokProvider): void {
  writeVault(readVault().filter((e) => e.provider !== provider));
}

export function clearVault(): void {
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Vault entries as stream-ready ByokConfigs, sorted by free-tier priority
 * (gemini → groq → openrouter → cerebras → mistral → openai), unknown
 * providers last. The router records quota cooldowns per provider, so the
 * order here is the failover order.
 */
export function orderedVaultEntries(): VaultEntry[] {
  const entries = readVault();
  const rank = new Map<ByokProvider, number>(FREE_PROVIDER_PRIORITY.map((p, i) => [p, i]));
  return entries
    .slice()
    .sort((a, b) => (rank.get(a.provider) ?? rank.size) - (rank.get(b.provider) ?? rank.size))
    .map((e) => ({ ...e }));
}

/** Adapter: vault entries → the ByokConfig shape streamByokChat consumes. */
export function vaultEntryAsByokConfig(entry: VaultEntry): ByokConfig {
  return {
    provider: entry.provider,
    apiKey: entry.apiKey,
    model: entry.model || "",
    mode: "always",
  };
}

/** Test hook — wipes the persisted vault. */
export function __resetKeyVaultForTests(): void {
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
