/**
 * Intelligent Workspace Batch 3 (MCP Bridge) — browser client for the local
 * companion process. Every request carries the pairing token and the
 * X-ShadowTalk-Bridge marker; the companion refuses anything else. No CORS
 * headers are sent on failures, so an unpaired cross-origin page cannot even
 * read an error message.
 */

import type {
  BridgeConnectionConfig,
  BridgeHealth,
  BridgeServerInfo,
  ToolInvocationResult,
} from "@/lib/mcpBridge/types";

const REQUEST_TIMEOUT_MS = 90_000; // tool calls can be slow; companion itself times out at 60s by default

export type ClientErrorKind = "network" | "unauthorized" | "forbidden" | "not-found" | "server" | "timeout";

export class McpBridgeClientError extends Error {
  kind: ClientErrorKind;
  status?: number;
  constructor(kind: ClientErrorKind, message: string, status?: number) {
    super(message);
    this.name = "McpBridgeClientError";
    this.kind = kind;
    this.status = status;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(trimmed)) {
    throw new McpBridgeClientError("forbidden", "The bridge URL must point at 127.0.0.1 or localhost — the companion never serves other hosts.");
  }
  return trimmed;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    // Custom header: browser cross-origin requests cannot add it without a
    // preflight the companion refuses without a valid token.
    "X-ShadowTalk-Bridge": "1",
  };
}

async function request<T>(
  baseUrl: string,
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if ((error as Error)?.name === "TimeoutError") {
      throw new McpBridgeClientError("timeout", "The local bridge did not answer in time — is it still running?");
    }
    throw new McpBridgeClientError("network", "Could not reach the local bridge. Start it with `node companion/shadowtalk-mcp-bridge.mjs` and check the port.");
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch { /* non-JSON */ }
  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `Bridge request failed (${response.status}).`;
    const kind: ClientErrorKind =
      response.status === 401 ? "unauthorized"
        : response.status === 403 ? "forbidden"
          : response.status === 404 ? "not-found"
            : "server";
    throw new McpBridgeClientError(kind, message, response.status);
  }
  return payload as T;
}

export class McpBridgeClient {
  constructor(readonly config: BridgeConnectionConfig) {}

  async health(): Promise<BridgeHealth> {
    const health = await request<BridgeHealth>(this.config.baseUrl, this.config.token, "/health");
    if (!health?.ok || health.bridge !== "shadowtalk-mcp-bridge") {
      throw new McpBridgeClientError("server", "That port answered, but it is not a ShadowTalk MCP bridge.");
    }
    return health;
  }

  async listServers(): Promise<BridgeServerInfo[]> {
    const payload = await request<{ servers: BridgeServerInfo[] }>(this.config.baseUrl, this.config.token, "/tools");
    return payload?.servers ?? [];
  }

  async invoke(server: string, tool: string, args: Record<string, unknown> = {}): Promise<ToolInvocationResult> {
    const payload = await request<{ ok: boolean; result: ToolInvocationResult }>(
      this.config.baseUrl,
      this.config.token,
      "/invoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server, tool, args }),
      },
    );
    // Unwrap the companion's { ok, result } envelope; the MCP tool result
    // (content blocks + isError) is what the caller needs.
    return payload?.result ?? (payload as unknown as ToolInvocationResult);
  }
}
