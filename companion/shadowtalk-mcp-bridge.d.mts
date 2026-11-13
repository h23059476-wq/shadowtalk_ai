/**
 * Type surface for the zero-dependency companion (implementation is plain
 * JavaScript in shadowtalk-mcp-bridge.mjs; tests and tooling import types
 * from here).
 */
export declare const BRIDGE_VERSION: string;
export declare const PROTOCOL_VERSION: string;

export declare class BridgeError extends Error {
  status: number;
  constructor(status: number, message: string);
}

export interface CompanionServerSpec {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  allowedRoots?: string[];
  callTimeoutMs?: number;
}

export interface CompanionConfig {
  port?: number;
  token?: string | null;
  servers: CompanionServerSpec[];
  auditLog?: string;
}

export interface CompanionBridge {
  server: import("node:http").Server;
  connections: Map<
    string,
    {
      spec: CompanionServerSpec;
      status: "ready" | "starting" | "stopped" | "error";
      tools: Array<Record<string, unknown>>;
      process: import("node:child_process").ChildProcess | null;
      ensureStarted: () => Promise<void>;
    }
  >;
  audit: (entry: Record<string, unknown>) => void;
  setToken: (token: string) => void;
  listen: (port: number) => Promise<number>;
  close: () => Promise<void>;
}

export declare function createBridge(
  config: CompanionConfig,
  deps?: { audit?: (entry: Record<string, unknown>) => void },
): CompanionBridge;

export declare function validateArgsAgainstRoots(
  spec: CompanionServerSpec,
  args: Record<string, unknown> | null | undefined,
): string | null;

export declare function summarizeArgs(
  args: Record<string, unknown> | null | undefined,
): Record<string, unknown>;
