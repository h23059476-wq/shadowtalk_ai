/**
 * Intelligent Workspace Batch 3 (MCP Bridge) — pairing persistence.
 *
 * The pairing token lives in localStorage like the BYOK keys (device-local,
 * same trust domain — see SECURITY_MODEL.md). Pairing is EXPLICIT: it only
 * happens when the user pastes the companion's token into Settings →
 * Local Tools. Nothing auto-connects, ever.
 */

import type { BridgeConnectionConfig } from "@/lib/mcpBridge/types";
import { fbAuth } from "@/integrations/firebase/app";

const CONNECTION_KEY_PREFIX = "shadowtalk.mcpBridge.connection.v1.";

function connectionKey(): string | null {
  const uid = fbAuth().currentUser?.uid;
  return uid ? `${CONNECTION_KEY_PREFIX}${uid}` : null;
}

export function loadConnection(): BridgeConnectionConfig | null {
  try {
    const key = connectionKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BridgeConnectionConfig;
    if (!parsed?.baseUrl || !parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConnection(baseUrl: string, token: string): BridgeConnectionConfig {
  const key = connectionKey();
  if (!key) throw new Error("Sign in before pairing the local bridge.");
  const config: BridgeConnectionConfig = { baseUrl: baseUrl.trim().replace(/\/+$/, ""), token: token.trim(), pairedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(config));
  return config;
}

export function clearConnection(): void {
  const key = connectionKey();
  if (key) localStorage.removeItem(key);
}
