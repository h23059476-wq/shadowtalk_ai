/**
 * Intelligent Workspace Batch 3 (MCP Bridge) — granular permissions.
 *
 * Categories are derived from the MCP tool annotations the server declared:
 *  - readOnlyHint  → "read-only"
 *  - destructiveHint or absence of readOnlyHint → "write" (conservative)
 *  - servers/tools whose names indicate execution semantics → "execute"
 * Discovery NEVER grants anything: every tool starts at "ask every use".
 * Only READ-ONLY tools may be upgraded to allow-always by the user, and the
 * grant is revocable at any time. Write/execute actions prompt EVERY use —
 * there is no "always allow" for sensitive operations.
 */

import type { BridgeTool, McpActivityEntry, PermissionCategory, ToolGrant } from "@/lib/mcpBridge/types";
import { fbAuth } from "@/integrations/firebase/app";

const EXEC_NAME_PATTERN = /(?:^|[_-])(exec|run|execute|shell|command|cmd)(?:[_-]|$)/i;

export function permissionCategory(tool: BridgeTool): PermissionCategory {
  const annotations = tool.annotations ?? {};
  if (EXEC_NAME_PATTERN.test(tool.name) && !annotations.readOnlyHint) return "execute";
  if (annotations.destructiveHint) return "write";
  if (annotations.readOnlyHint === true) return "read-only";
  // Unknown semantics are treated as write — the conservative default.
  return "write";
}

const GRANTS_KEY_PREFIX = "shadowtalk.mcpBridge.grants.v1.";

function grantsKey(): string | null {
  const uid = fbAuth().currentUser?.uid;
  return uid ? `${GRANTS_KEY_PREFIX}${uid}` : null;
}

export function loadGrants(): Record<string, ToolGrant> {
  try {
    const key = grantsKey();
    if (!key) return {};
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, ToolGrant>;
    // Write/execute grants must never persist — strip them defensively even
    // if a hand-edited storage tries to smuggle one in.
    const clean: Record<string, ToolGrant> = {};
    for (const [toolKey, grant] of Object.entries(parsed)) {
      if (grant === "allow-always" && !isGrantedToolKeyReadOnly(toolKey)) continue;
      clean[toolKey] = grant;
    }
    return clean;
  } catch {
    return {};
  }
}

/** Read-only allow-always entries are suffixed at write time; anything else
 *  in storage claiming always-allow is invalid. */
function isGrantedToolKeyReadOnly(_toolKey: string): boolean {
  // The category is checked at grant time — read-only grants are stored with
  // a "#ro" suffix so a stale entry cannot outlive a category change.
  return _toolKey.endsWith("#ro");
}

export function saveGrant(toolKey: string, category: PermissionCategory, grant: ToolGrant): void {
  const key = grantsKey();
  if (!key) return;
  if (category !== "read-only" && grant === "allow-always") {
    throw new Error("Sensitive tools cannot be allowed permanently — they require explicit confirmation every time.");
  }
  const grants = loadGrants();
  const storageKey = category === "read-only" ? `${toolKey}#ro` : toolKey;
  if (grant === null) delete grants[storageKey];
  else grants[storageKey] = grant;
  localStorage.setItem(key, JSON.stringify(grants));
}

export type PermissionDecision =
  | { decision: "allowed" }
  | { decision: "denied-by-user" }
  | { decision: "needs-approval" };

/** Decide whether an invocation may proceed without a prompt. */
export function checkPermission(toolKey: string, tool: BridgeTool, grants: Record<string, ToolGrant>): PermissionDecision {
  const category = permissionCategory(tool);
  if (category === "read-only") {
    const grant = grants[`${toolKey}#ro`] ?? null;
    if (grant === "allow-always") return { decision: "allowed" };
    if (grant === "deny-always") return { decision: "denied-by-user" };
    return { decision: "needs-approval" };
  }
  // Write/execute: always prompt.
  return { decision: "needs-approval" };
}

/** ---------- client-side activity ring buffer ---------- */

const ACTIVITY_KEY_PREFIX = "shadowtalk.mcpBridge.activity.v1.";
const MAX_ACTIVITY = 50;

export function recordActivity(entry: McpActivityEntry): void {
  try {
    const uid = fbAuth().currentUser?.uid;
    if (!uid) return;
    const key = `${ACTIVITY_KEY_PREFIX}${uid}`;
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as McpActivityEntry[];
    const next = [entry, ...existing].slice(0, MAX_ACTIVITY);
    localStorage.setItem(key, JSON.stringify(next));
  } catch { /* activity log is best-effort */ }
}

export function loadActivity(): McpActivityEntry[] {
  try {
    const uid = fbAuth().currentUser?.uid;
    if (!uid) return [];
    return JSON.parse(localStorage.getItem(`${ACTIVITY_KEY_PREFIX}${uid}`) ?? "[]") as McpActivityEntry[];
  } catch {
    return [];
  }
}

export function clearActivity(): void {
  const uid = fbAuth().currentUser?.uid;
  if (uid) localStorage.removeItem(`${ACTIVITY_KEY_PREFIX}${uid}`);
}
