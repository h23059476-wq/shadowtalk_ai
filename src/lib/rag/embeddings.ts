/**
 * Intelligent Workspace Batch 2 (Stealth RAG) — embedding providers.
 *
 * Two REAL implementations behind one interface:
 *
 *  1. local-hash (default): deterministic feature-hashing embeddings computed
 *     entirely in the browser. No network, no cost, works everywhere. Honest
 *     labeling: this is a LEXICAL embedding, not a neural model — retrieval
 *     quality is calibrated in the test suite, never claimed otherwise.
 *  2. remote-byok (explicit opt-in): documented /embeddings endpoints of
 *     providers whose APIs actually expose them, using the user's existing
 *     BYOK key. Nothing is sent anywhere without the user enabling it, and
 *     the UI must disclose remote processing whenever an index was built
 *     this way. No silent provider switching: only the user's own configured
 *     provider is used, and only if it appears in EMBEDDING_CAPABLE_PROVIDERS.
 *
 * A neural WebGPU path (transformers.js) was investigated and deliberately
 * NOT shipped: the dependency was removed from this codebase for bundle size
 * (docs/audit/CLAIMS_REALITY_REPORT.md P0-8c) and re-adding it would put
 * ~10 MB of onnxruntime WASM into every PWA precache. The interface below
 * leaves room for it as a future opt-in without re-plumbing callers.
 */

import type { ByokProvider } from "@/lib/byok";
import { fbAuth } from "@/integrations/firebase/app";

export interface EmbeddingProvider {
  /** Stable id persisted in the user preference. */
  readonly id: string;
  /** Human-readable label (surfaced in the context indicator). */
  readonly label: string;
  /** true = computation stays on-device; false = document text is sent to the provider. */
  readonly local: boolean;
  readonly dim: number;
  /** Embed a batch of texts. Order of results matches order of inputs. */
  embed(texts: string[], signal?: AbortSignal): Promise<number[][]>;
}

const HASH_DIM = 512;

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((t) => t.length > 1 && t.length < 40);
}

/**
 * Local feature-hashing embedder: token unigrams + bigrams hashed into a
 * fixed 512-dim space with signed hashing (collision noise cancels in
 * expectation), sublinear term frequency, L2 normalization.
 */
export class LocalHashEmbedder implements EmbeddingProvider {
  readonly id = "local-hash";
  readonly label = "Local (on-device lexical embeddings)";
  readonly local = true as const;
  readonly dim = HASH_DIM;

  async embed(texts: string[], _signal?: AbortSignal): Promise<number[][]> {
    return texts.map((text) => this.embedOne(text));
  }

  private embedOne(text: string): number[] {
    const vector = new Float64Array(HASH_DIM);
    const tokens = tokenize(text);
    const termFreq = new Map<string, number>();
    for (let i = 0; i < tokens.length; i++) {
      termFreq.set(tokens[i], (termFreq.get(tokens[i]) ?? 0) + 1);
      if (i + 1 < tokens.length) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        termFreq.set(bigram, (termFreq.get(bigram) ?? 0) + 1);
      }
    }
    for (const [term, tf] of termFreq) {
      const hash = fnv1a(term);
      const index = hash % HASH_DIM;
      // Second hash bit as the sign — signed hashing makes collisions cancel
      // in expectation instead of biasing the vector upward.
      const sign = (hash >>> 9) & 1 ? 1 : -1;
      vector[index] += sign * (1 + Math.log(tf));
    }
    let norm = 0;
    for (let i = 0; i < HASH_DIM; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm) || 1;
    const out: number[] = new Array(HASH_DIM);
    for (let i = 0; i < HASH_DIM; i++) out[i] = vector[i] / norm;
    return out;
  }
}

/**
 * Providers with DOCUMENTED OpenAI-shaped /embeddings endpoints. Providers
 * outside this set are refused — guessing endpoints would leak document
 * text to unverified URLs.
 */
export const EMBEDDING_CAPABLE_PROVIDERS: ReadonlySet<ByokProvider> = new Set([
  "openai",
  "gemini",
  "mistral",
  "together",
  "fireworks",
  "novita",
  "deepinfra",
  "hyperbolic",
]);

interface EmbeddingEndpoint {
  url: string;
  defaultModel: string;
  label: string;
}

const EMBEDDING_ENDPOINTS: Record<string, EmbeddingEndpoint> = {
  openai: { url: "https://api.openai.com/v1/embeddings", defaultModel: "text-embedding-3-small", label: "OpenAI embeddings" },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/embeddings", defaultModel: "text-embedding-004", label: "Google Gemini embeddings" },
  mistral: { url: "https://api.mistral.ai/v1/embeddings", defaultModel: "mistral-embed", label: "Mistral embeddings" },
  together: { url: "https://api.together.xyz/v1/embeddings", defaultModel: "BAAI/bge-large-en-v1.5", label: "Together AI embeddings" },
  fireworks: { url: "https://api.fireworks.ai/inference/v1/embeddings", defaultModel: "nomic-ai/nomic-embed-text-v1.5", label: "Fireworks AI embeddings" },
  novita: { url: "https://api.novita.ai/v3/openai/embeddings", defaultModel: "baai/bge-m3", label: "Novita AI embeddings" },
  deepinfra: { url: "https://api.deepinfra.com/v1/openai/embeddings", defaultModel: "BAAI/bge-large-en-v1.5", label: "DeepInfra embeddings" },
  hyperbolic: { url: "https://api.hyperbolic.xyz/v1/embeddings", defaultModel: "BAAI/bge-large-en-v1.5", label: "Hyperbolic embeddings" },
};

export class RemoteEmbedder implements EmbeddingProvider {
  readonly id: string;
  readonly label: string;
  readonly local = false as const;
  /** Discovered from the first response — consumers must not assume a fixed
   *  size across providers. */
  dim = 0;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly provider: ByokProvider;

  constructor(provider: ByokProvider, apiKey: string, model?: string) {
    if (!EMBEDDING_CAPABLE_PROVIDERS.has(provider)) {
      throw new Error(`${provider} does not document an embeddings API — remote embeddings refused.`);
    }
    const endpoint = EMBEDDING_ENDPOINTS[provider];
    this.provider = provider;
    this.id = `remote:${provider}`;
    this.label = `Remote via ${endpoint.label}`;
    this.endpoint = endpoint.url;
    this.model = model?.trim() || endpoint.defaultModel;
    this.apiKey = apiKey;
  }

  /** The provider whose key is used (disclosure in UI). */
  get remoteProvider(): ByokProvider {
    return this.provider;
  }

  get remoteModel(): string {
    return this.model;
  }

  async embed(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    if (texts.length === 0) return [];
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, input: texts }),
        signal,
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") throw error;
      throw new Error(`Could not reach ${this.label}. Check the connection and try again.`);
    }
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body?.error?.message || body?.error || "";
      } catch { /* ignore */ }
      throw new Error(
        response.status === 401
          ? `Your ${this.provider} key was rejected for embeddings.`
          : `${this.label} failed (${response.status})${detail ? `: ${detail}` : ""}`,
      );
    }
    const payload = (await response.json()) as { data?: Array<{ index?: number; embedding?: number[] }> };
    const data = Array.isArray(payload?.data) ? [...payload.data] : [];
    // Results must map back to the input order by the documented index field.
    data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const embeddings = data.map((d) => d.embedding);
    if (embeddings.length !== texts.length || embeddings.some((e) => !Array.isArray(e))) {
      throw new Error(`${this.label} returned an unexpected embeddings shape.`);
    }
    if (this.dim === 0 && embeddings[0]) {
      this.dim = embeddings[0].length;
    }
    return embeddings as number[][];
  }
}

/** Create the default provider: always local, never a network call. */
export function createLocalEmbedder(): EmbeddingProvider {
  return new LocalHashEmbedder();
}

/** Cosine similarity for equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Ingestion embedder resolution: local unless the user explicitly opted into
 * remote embeddings for their account (consent stored per-user in
 * localStorage; the consent record is what makes the first remote use
 * explicit rather than silent).
 */
const PREF_KEY_PREFIX = "shadowtalk.rag.embedding.v1.";

export type EmbeddingPreference =
  | { kind: "local" }
  | { kind: "remote"; provider: ByokProvider; model?: string; consentedAt: string };

export function getEmbeddingPreference(userId: string): EmbeddingPreference {
  try {
    const raw = localStorage.getItem(`${PREF_KEY_PREFIX}${userId}`);
    if (!raw) return { kind: "local" };
    const parsed = JSON.parse(raw) as EmbeddingPreference;
    if (parsed?.kind === "remote" && EMBEDDING_CAPABLE_PROVIDERS.has(parsed.provider)) return parsed;
    return { kind: "local" };
  } catch {
    return { kind: "local" };
  }
}

export function setEmbeddingPreference(userId: string, preference: EmbeddingPreference): void {
  localStorage.setItem(`${PREF_KEY_PREFIX}${userId}`, JSON.stringify(preference));
}

export function currentUserId(): string | null {
  return fbAuth().currentUser?.uid ?? null;
}
