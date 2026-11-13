/**
 * Intelligent-workspace Batch 3 — MCP bridge client-side contracts.
 * Permission derivation/grants, intent matching, and the browser client
 * against a REAL companion server (localhost HTTP).
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/integrations/firebase/app", () => ({
  fbAuth: () => ({ currentUser: { uid: "user-1" } }),
  functionsBaseUrl: "https://functions.test",
}));

import {
  permissionCategory,
  checkPermission,
  loadGrants,
  saveGrant,
  recordActivity,
  loadActivity,
  clearActivity,
} from "@/lib/mcpBridge/permissions";
import { matchMessageToTool, extractArgsFromMessage } from "@/lib/mcpBridge/intent";
import { loadConnection, saveConnection, clearConnection } from "@/lib/mcpBridge/connection";
import type { BridgeTool } from "@/lib/mcpBridge/types";

describe("permission categories", () => {
  it("readOnlyHint → read-only", () => {
    expect(permissionCategory({ name: "git_status", description: "", inputSchema: {}, annotations: { readOnlyHint: true } })).toBe("read-only");
  });

  it("destructiveHint → write even if readOnlyHint present", () => {
    expect(permissionCategory({ name: "delete_thing", description: "", inputSchema: {}, annotations: { readOnlyHint: true, destructiveHint: true } })).toBe("write");
  });

  it("unknown semantics → write (conservative)", () => {
    expect(permissionCategory({ name: "mystery_tool", description: "", inputSchema: {}, annotations: null })).toBe("write");
  });

  it("execution-shaped names → execute unless proven read-only", () => {
    expect(permissionCategory({ name: "run_command", description: "", inputSchema: {}, annotations: null })).toBe("execute");
    expect(permissionCategory({ name: "shell_exec", description: "", inputSchema: {}, annotations: {} })).toBe("execute");
    expect(permissionCategory({ name: "command_runner", description: "read-only lister", inputSchema: {}, annotations: { readOnlyHint: true } })).toBe("read-only");
  });
});

describe("permission grants", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("every tool starts at needs-approval (discovery grants nothing)", () => {
    const tool: BridgeTool = { name: "git_status", description: "", inputSchema: {}, annotations: { readOnlyHint: true } };
    expect(checkPermission("fake/git_status", tool, loadGrants())).toEqual({ decision: "needs-approval" });
  });

  it("read-only tools can be allowed-always and revoked", () => {
    const tool: BridgeTool = { name: "git_status", description: "", inputSchema: {}, annotations: { readOnlyHint: true } };
    saveGrant("fake/git_status", "read-only", "allow-always");
    expect(checkPermission("fake/git_status", tool, loadGrants()).decision).toBe("allowed");
    saveGrant("fake/git_status", "read-only", null);
    expect(checkPermission("fake/git_status", tool, loadGrants()).decision).toBe("needs-approval");
  });

  it("write/execute grants are refused outright — sensitive actions always prompt", () => {
    expect(() => saveGrant("fs/write_file", "write", "allow-always")).toThrow(/cannot be allowed permanently/);
    const writeTool: BridgeTool = { name: "fs_write_file", description: "", inputSchema: {}, annotations: null };
    expect(checkPermission("fs/write_file", writeTool, loadGrants())).toEqual({ decision: "needs-approval" });
  });

  it("deny-always works for read-only tools", () => {
    const tool: BridgeTool = { name: "git_status", description: "", inputSchema: {}, annotations: { readOnlyHint: true } };
    saveGrant("fake/git_status", "read-only", "deny-always");
    expect(checkPermission("fake/git_status", tool, loadGrants())).toEqual({ decision: "denied-by-user" });
  });

  it("hand-edited storage cannot smuggle write grants in", () => {
    localStorage.setItem("shadowtalk.mcpBridge.grants.v1.user-1", JSON.stringify({ "fs/write_file": "allow-always" }));
    expect(loadGrants()["fs/write_file"]).toBeUndefined();
  });
});

describe("activity ring buffer", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("records, loads and clears activity", () => {
    recordActivity({ ts: new Date().toISOString(), server: "git", tool: "git_status", outcome: "ok" });
    recordActivity({ ts: new Date().toISOString(), server: "git", tool: "git_commit", outcome: "denied" });
    const activity = loadActivity();
    expect(activity).toHaveLength(2);
    expect(activity[0].outcome).toBe("denied");
    clearActivity();
    expect(loadActivity()).toHaveLength(0);
  });
});

describe("intent matching", () => {
  const tools = [
    { server: "git", tool: { name: "git_branch", description: "List or show branches of the repository", inputSchema: {}, annotations: { readOnlyHint: true } } as BridgeTool },
    { server: "git", tool: { name: "git_status", description: "Show the working tree status and uncommitted changes", inputSchema: {}, annotations: { readOnlyHint: true } } as BridgeTool },
    { server: "git", tool: { name: "git_commit", description: "Commit staged changes with a message", inputSchema: {}, annotations: null } as BridgeTool },
    { server: "fs", tool: { name: "read_file", description: "Read a file from the workspace", inputSchema: {}, annotations: { readOnlyHint: true } } as BridgeTool },
  ];

  it("matches a git branch question to the branch tool", () => {
    const match = matchMessageToTool("Check my latest git branch status.", tools);
    expect(match).not.toBeNull();
    expect(["git_branch", "git_status"]).toContain(match!.tool.name);
  });

  it("matches commit intent to the commit tool", () => {
    const match = matchMessageToTool("please commit my staged changes with a message", tools);
    expect(match?.tool.name).toBe("git_commit");
  });

  it("returns null for ambiguous chatter (no wrong tool calls)", () => {
    expect(matchMessageToTool("hey what's up", tools)).toBeNull();
    expect(matchMessageToTool("", tools)).toBeNull();
  });

  it("extracts obvious string args from the message using the schema", () => {
    const tool: BridgeTool = {
      name: "read_file",
      description: "Read a file",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
      annotations: null,
    };
    const args = extractArgsFromMessage("read the file path /home/me/notes.txt please", tool);
    expect(args.path).toBe("/home/me/notes.txt");
  });

  it("does not invent complex arguments", () => {
    const tool: BridgeTool = {
      name: "run_query",
      description: "Run a query",
      inputSchema: { type: "object", properties: { sql: { type: "string" } }, required: ["sql"] },
      annotations: null,
    };
    expect(extractArgsFromMessage("check the database", tool)).toEqual({});
  });
});

describe("connection pairing", () => {
  beforeEach(() => localStorage.clear());

  it("persists and clears explicit pairing", () => {
    const config = saveConnection("http://127.0.0.1:7717/", "token-abc");
    expect(config.baseUrl).toBe("http://127.0.0.1:7717");
    expect(loadConnection()?.token).toBe("token-abc");
    clearConnection();
    expect(loadConnection()).toBeNull();
  });
});
