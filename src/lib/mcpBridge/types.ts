/**
 * Intelligent Workspace Batch 3 (MCP Bridge) — shared client types.
 */

export interface BridgeTool {
  name: string;
  description: string;
  inputSchema: unknown;
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  } | null;
}

export interface BridgeServerInfo {
  server: string;
  status: "ready" | "starting" | "stopped" | "error";
  allowedRoots: string[] | null;
  tools: BridgeTool[];
  error?: string;
}

export interface BridgeHealth {
  ok: boolean;
  bridge: string;
  version: string;
  protocol: string;
  servers: string[];
  serverStatus: Record<string, string>;
}

export interface ToolInvocationResult {
  ok: boolean;
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export type PermissionCategory =
  | "read-only"
  | "write"
  | "execute";

/**
 * What the user grants per tool:
 *  - read-only tools may be allowed once-for-all (still revocable);
 *  - write/execute tools ALWAYS require explicit per-use approval — there is
 *    no "always allow" for sensitive actions.
 */
export type ToolGrant = "allow-always" | "deny-always" | null;

export interface BridgeConnectionConfig {
  baseUrl: string;
  token: string;
  pairedAt: string;
}

export interface McpActivityEntry {
  ts: string;
  server: string;
  tool: string;
  outcome: "ok" | "error" | "denied";
  detail?: string;
}
