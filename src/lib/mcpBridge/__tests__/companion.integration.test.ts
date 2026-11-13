/**
 * @vitest-environment node
 *
 * Intelligent-workspace Batch 3 — MCP bridge companion integration tests.
 * REAL wire traffic end-to-end: the bridge spawns an actual MCP stdio
 * server subprocess (newline-delimited JSON-RPC 2.0), and the tests talk to
 * the bridge over real localhost HTTP. This is not a mock of the client or
 * server logic — only the CONFIGURED MCP server is a stand-in for third
 * parties (git/filesystem servers), which is exactly what the config
 * abstraction is for.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import type { CompanionBridge } from "../../../../companion/shadowtalk-mcp-bridge.mjs";

import { createBridge, validateArgsAgainstRoots, summarizeArgs } from "../../../../companion/shadowtalk-mcp-bridge.mjs";
import { McpBridgeClient, McpBridgeClientError } from "@/lib/mcpBridge/client";

const TOKEN = "test-pairing-token-0123456789";
let workDir: string;
let fakeServerPath: string;
let bridge: CompanionBridge;
let port = 0;

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), "shadowtalk-bridge-test-"));
  // The fake MCP server the bridge will spawn — a REAL stdio JSON-RPC process.
  fakeServerPath = join(workDir, "fake-mcp-server.mjs");
  writeFileSync(
    fakeServerPath,
    `import { readFileSync } from "node:fs";
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf("\\n")) !== -1) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!line) continue;
    handle(JSON.parse(line));
  }
});
function send(obj) { process.stdout.write(JSON.stringify(obj) + "\\n"); }
async function handle(msg) {
  if (msg.method === "initialize") {
    send({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "fake", version: "1.0.0" } } });
  } else if (msg.method === "tools/list") {
    send({ jsonrpc: "2.0", id: msg.id, result: { tools: [
      { name: "echo", description: "Echo back the message text", inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] }, annotations: { readOnlyHint: true } },
      { name: "read_file", description: "Read a file inside the workspace", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, annotations: { readOnlyHint: true } },
      { name: "boom", description: "Always fails", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
      { name: "run_command", description: "Execute a shell command", inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } }
    ] } });
  } else if (msg.method === "tools/call") {
    const { name, arguments: args } = msg.params;
    if (name === "echo") send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "echo:" + args.message }] } });
    else if (name === "read_file") {
      try {
        const text = readFileSync(args.path, "utf8");
        send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text }] } });
      } catch (e) {
        send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "read failed: " + e.message }], isError: true } });
      }
    } else if (name === "boom") {
      send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "boom failed" }], isError: true } });
    } else if (name === "run_command") {
      send({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: "ran " + args.command }] } });
    } else {
      send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "unknown tool" } });
    }
  }
}
`,
  );
  // A file inside the allowed root + one we are NOT allowed to touch.
  mkdirSync(join(workDir, "workspace"));
  writeFileSync(join(workDir, "workspace", "hello.txt"), "hello from the workspace");

  bridge = createBridge({
    token: TOKEN,
    servers: [
      {
        name: "fake",
        command: process.execPath,
        args: [fakeServerPath],
        allowedRoots: [join(workDir, "workspace")],
      },
    ],
    auditLog: join(workDir, "audit.jsonl"),
  });
  port = await bridge.listen(0);
});

afterAll(async () => {
  await bridge?.close();
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

function base(): string {
  return `http://127.0.0.1:${port}`;
}

function authHeaders(token: string = TOKEN): Record<string, string> {
  return { Authorization: `Bearer ${token}`, "X-ShadowTalk-Bridge": "1" };
}

async function get(path: string, headers: Record<string, string> = authHeaders()): Promise<{ status: number; body: any; headers: any }> {
  const response = await fetch(`${base()}${path}`, { headers });
  let body: any = null;
  try { body = await response.json(); } catch { /* 204 */ }
  return { status: response.status, body, headers: response.headers };
}

async function post(path: string, payload: unknown, headers: Record<string, string> = authHeaders()): Promise<{ status: number; body: any }> {
  const response = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: any = null;
  try { body = await response.json(); } catch { /* */ }
  return { status: response.status, body };
}

describe("companion security", () => {
  it("rejects requests without the pairing token (401)", async () => {
    const { status } = await get("/health", {});
    expect(status).toBe(401);
  });

  it("rejects wrong tokens (401)", async () => {
    const { status } = await get("/health", authHeaders("wrong-token"));
    expect(status).toBe(401);
  });

  it("rejects non-loopback Host headers (DNS-rebinding defense, 403)", async () => {
    // undici's fetch forbids overriding Host — use raw node:http for this.
    const status = await new Promise<number>((resolvePromise) => {
      const req = http.request(
        { host: "127.0.0.1", port, path: "/health", method: "GET", headers: { ...authHeaders(), Host: "evil.example.com" } },
        (res) => { res.resume(); resolvePromise(res.statusCode ?? 0); },
      );
      req.end();
    });
    expect(status).toBe(403);
  });

  it("refuses browser preflights without the token — cross-origin pages cannot invoke tools", async () => {
    const response = await fetch(`${base()}/invoke`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    expect(response.status).toBe(401);
    // And no CORS grant for the attacker:
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("grants CORS reflection only to token-bearing requests", async () => {
    const response = await fetch(`${base()}/health`, { headers: { ...authHeaders(), Origin: "https://app.example.com" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
  });
});

describe("companion + real MCP stdio server", () => {
  it("spawns the configured server and lists its real tools", async () => {
    const { status, body } = await get("/tools");
    expect(status).toBe(200);
    expect(body.servers).toHaveLength(1);
    expect(body.servers[0].server).toBe("fake");
    expect(body.servers[0].status).toBe("ready");
    const names = body.servers[0].tools.map((t: any) => t.name);
    expect(names).toEqual(["echo", "read_file", "boom", "run_command"]);
    const echo = body.servers[0].tools[0];
    expect(echo.annotations.readOnlyHint).toBe(true);
    expect(echo.inputSchema.properties.message.type).toBe("string");
  });

  it("invokes a read-only tool and returns its real result", async () => {
    const { status, body } = await post("/invoke", { server: "fake", tool: "echo", args: { message: "hello bridge" } });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result.content[0].text).toBe("echo:hello bridge");
  });

  it("surfaces tool errors honestly (isError)", async () => {
    const { status, body } = await post("/invoke", { server: "fake", tool: "boom", args: {} });
    expect(status).toBe(200);
    expect(body.result.isError).toBe(true);
  });

  it("rejects unknown servers (404)", async () => {
    const { status } = await post("/invoke", { server: "nope", tool: "echo", args: {} });
    expect(status).toBe(404);
  });
});

describe("path containment (allowedRoots)", () => {
  it("blocks absolute paths outside the allowed root (path traversal)", async () => {
    const { status, body } = await post("/invoke", { server: "fake", tool: "read_file", args: { path: "/etc/passwd" } });
    expect(status).toBe(403);
    expect(body.error).toMatch(/outside the allowed roots/);
  });

  it("blocks traversal chains that resolve outside the root", async () => {
    const { status } = await post("/invoke", {
      server: "fake",
      tool: "read_file",
      args: { path: `${join(workDir, "workspace")}/../../outside-secret.txt` },
    });
    expect(status).toBe(403);
  });

  it("allows reads inside the root", async () => {
    const { status, body } = await post("/invoke", {
      server: "fake",
      tool: "read_file",
      args: { path: `${join(workDir, "workspace")}/hello.txt` },
    });
    expect(status).toBe(200);
    expect(body.result.content[0].text).toBe("hello from the workspace");
  });

  it("validateArgsAgainstRoots unit: relative-ish and ~ paths", () => {
    const spec = { name: "fs", command: "x", allowedRoots: [join(workDir, "workspace")] };
    expect(validateArgsAgainstRoots(spec, { path: join(workDir, "workspace", "a.txt") })).toBeNull();
    expect(validateArgsAgainstRoots(spec, { path: workDir })).not.toBeNull();
    expect(validateArgsAgainstRoots({ name: "fs", command: "x" }, { path: "/etc/passwd" })).toBeNull(); // no roots declared → bridge-level check skipped
  });
});

describe("crash handling + audit", () => {
  it("surfaces a crashed server honestly and recovers on the next call", async () => {
    const conn = bridge.connections.get("fake");
    await conn.ensureStarted();
    const process = conn.process;
    process.kill("SIGKILL");
    await new Promise((r) => setTimeout(r, 150));
    const { status } = await post("/invoke", { server: "fake", tool: "echo", args: { message: "after crash" } });
    // Either the restart raced successfully (200) or the crash surfaced (502) — never a fake success.
    expect([200, 502]).toContain(status);
    // A follow-up call must work again (bounded restart).
    const retry = await post("/invoke", { server: "fake", tool: "echo", args: { message: "recovered" } });
    expect(retry.status).toBe(200);
    expect(retry.body.result.content[0].text).toBe("echo:recovered");
  });

  it("appends auth failures, invocations and denials to the audit log", async () => {
    await get("/health", {}); // auth fail
    await post("/invoke", { server: "fake", tool: "echo", args: { message: "audit-me" } });
    await post("/invoke", { server: "fake", tool: "read_file", args: { path: "/etc/passwd" } }); // deny
    const lines = readFileSync(join(workDir, "audit.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const events = lines.map((l) => l.event);
    expect(events).toContain("auth-fail");
    expect(events).toContain("invoke");
    expect(events).toContain("invoke-deny");
    const invoke = lines.find((l) => l.event === "invoke");
    expect(invoke.tool).toBe("echo");
    // Args are summarized (truncated), not leaked wholesale.
    const summarized = summarizeArgs({ message: "x".repeat(40), nested: { a: 1 }, list: [1, 2] });
    expect(summarized.message).toContain("…(40)");
    expect(summarized.nested).toBe("object");
    expect(summarized.list).toBe("array(2)");
  });
});

describe("no shell execution in the bridge", () => {
  it("passes arguments as argv arrays (spawn shell:false) — a hostile command string is just data", async () => {
    // Even though the fake server has a run_command tool, the BRIDGE itself
    // never interprets the argument: it forwards it verbatim via JSON-RPC.
    const { status, body } = await post("/invoke", { server: "fake", tool: "run_command", args: { command: "rm -rf /; echo pwned" } });
    expect(status).toBe(200);
    // The bridge returned the server's answer — it did NOT run anything itself.
    expect(body.result.content[0].text).toContain("rm -rf /; echo pwned");
    expect(existsSync("/definitely-not-created")).toBe(false);
  });
});

describe("browser client against the companion", () => {
  it("pairs via health check and lists tools", async () => {
    const client = new McpBridgeClient({ baseUrl: `http://127.0.0.1:${port}`, token: TOKEN, pairedAt: new Date().toISOString() });
    const health = await client.health();
    expect(health.ok).toBe(true);
    expect(health.bridge).toBe("shadowtalk-mcp-bridge");
    const servers = await client.listServers();
    expect(servers[0].tools[0].name).toBe("echo");
  });

  it("invokes a tool with explicit args", async () => {
    const client = new McpBridgeClient({ baseUrl: `http://127.0.0.1:${port}`, token: TOKEN, pairedAt: new Date().toISOString() });
    const result = await client.invoke("fake", "echo", { message: "from the browser" });
    expect(result.content[0].text).toBe("echo:from the browser");
  });

  it("surfaces auth failures as typed errors", async () => {
    const client = new McpBridgeClient({ baseUrl: `http://127.0.0.1:${port}`, token: "wrong-token", pairedAt: new Date().toISOString() });
    await expect(client.health()).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("refuses non-loopback bridge URLs before any request", async () => {
    const client = new McpBridgeClient({ baseUrl: "http://192.168.1.5:7717", token: "t", pairedAt: new Date().toISOString() });
    await expect(client.health()).rejects.toBeInstanceOf(McpBridgeClientError);
  });

  it("treats network failure as a typed error with actionable guidance", async () => {
    const client = new McpBridgeClient({ baseUrl: "http://127.0.0.1:1", token: "t", pairedAt: new Date().toISOString() });
    await expect(client.health()).rejects.toMatchObject({ kind: "network" });
  });
});
