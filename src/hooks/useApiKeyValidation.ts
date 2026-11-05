import { useState, useCallback, useRef } from "react";
import { BYOK_PROVIDERS, type ByokProvider } from "@/lib/byok";

/**
 * Silent API key validation — pings the provider's /v1/models endpoint
 * (or equivalent) with a HEAD/GET request and reports validity.
 *
 * Used by SettingsByokCard to show the green "[✔ Validated]" badge the
 * moment a user pastes a working key, without making them click "Test".
 *
 * Validation is debounced (800ms after last keystroke) and aborted if a
 * newer validation starts. Never blocks the UI.
 */

export interface ApiKeyValidationState {
  status: "idle" | "validating" | "valid" | "invalid" | "error";
  /** Human-readable model count if available, e.g. "23 models available" */
  detail?: string;
  /** ISO timestamp of last successful validation */
  lastChecked?: string;
  /** Model IDs available for this key (when status === "valid"). */
  models: string[];
  /** Trigger a validation now (debounced). Pass the live key + provider. */
  validate: (provider: ByokProvider, apiKey: string) => void;
  /** Reset to idle. */
  reset: () => void;
}

interface ModelsResponse {
  data?: Array<{ id: string }>;
  models?: Array<{ id: string }>;
}

/**
 * Map provider -> the /v1/models URL we ping for validation.
 * Falls back to the chat-completions URL with /models suffix.
 */
function modelsUrlFor(provider: ByokProvider): string {
  const cfg = BYOK_PROVIDERS[provider];
  if (!cfg) return "";
  if (provider === "anthropic") {
    // Anthropic's models endpoint is /v1/models (the messages URL has no
    // /chat/completions suffix to rewrite, so map it explicitly).
    return "https://api.anthropic.com/v1/models";
  }
  // Most OpenAI-compatible providers expose /models at the same base.
  return cfg.url.replace(/\/chat\/completions$/, "/models");
}

async function pingModels(
  provider: ByokProvider,
  apiKey: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; modelCount?: number; models?: string[]; error?: string }> {
  const url = modelsUrlFor(provider);
  if (!url) return { ok: false, error: "Unknown provider" };

  // Anthropic authenticates with x-api-key + anthropic-version, not a Bearer
  // header — using Bearer made every valid Anthropic key look rejected.
  const headers: Record<string, string> =
    provider === "anthropic"
      ? {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        }
      : {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal,
      // Avoid sending cookies / credentials — BYOK should be CORS-only.
      credentials: "omit",
      mode: "cors",
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as ModelsResponse;
    const list = json.data || json.models || [];
    const modelIds = list.map((m) => m.id).filter(Boolean).sort();
    return { ok: true, modelCount: modelIds.length, models: modelIds };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, error: "aborted" };
    }
    // CORS errors are common for Anthropic / Google native endpoints.
    // We treat them as "unknown" rather than invalid — the key may still work
    // for chat completion even if /models is CORS-blocked.
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

export function useApiKeyValidation(): ApiKeyValidationState {
  const [status, setStatus] = useState<ApiKeyValidationState["status"]>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [lastChecked, setLastChecked] = useState<string | undefined>();
  const [models, setModels] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const validate = useCallback((provider: ByokProvider, apiKey: string) => {
    // Reset
    if (!apiKey || apiKey.trim().length < 10) {
      setStatus("idle");
      setDetail(undefined);
      return;
    }
    // Don't validate placeholder keys
    if (apiKey.includes("...") && apiKey.length < 20) {
      setStatus("idle");
      return;
    }

    // Debounce 800ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    setStatus("validating");
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await pingModels(provider, apiKey, controller.signal);
        if (result.ok) {
          setStatus("valid");
          setDetail(
            result.modelCount
              ? `${result.modelCount} models available`
              : "Key accepted",
          );
          setModels(result.models || []);
          setLastChecked(new Date().toISOString());
        } else if (result.error === "aborted") {
          // Newer validation in flight — leave state as-is
          return;
        } else if (result.error === "HTTP 401" || result.error === "HTTP 403") {
          setStatus("invalid");
          setDetail("Key rejected by provider");
        } else {
          // CORS / network / unknown — treat as "unable to verify"
          setStatus("error");
          setDetail("Can't verify (CORS) — try Test to confirm");
        }
      } catch {
        setStatus("error");
        setDetail("Network error");
      }
    }, 800);
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setDetail(undefined);
    setModels([]);
  }, []);

  return { status, detail, lastChecked, models, validate, reset };
}

export default useApiKeyValidation;
