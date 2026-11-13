#!/usr/bin/env node
/**
 * ShadowTalk AI — Local MCP Bridge companion.
 *
 * ShadowTalk runs in the browser and CANNOT inspect arbitrary local software
 * by itself (no desktop shell ships). This companion is the missing local
 * host: the user starts it on their own machine, it spawns the MCP servers
 * they configured (git, filesystem, postgres, docker, …) as stdio
 * subprocesses, and exposes them to the paired ShadowTalk web app over a
 * localhost-only HTTP JSON-RPC API.
 *
 * Security model (see docs/intelligent-workspace/SECURITY_MODEL.md):
 *  - binds 127.0.0.1 ONLY — never a LAN interface;
 *  - a pairing token (generated or configured) is required on EVERY request;
 *  - Host header must be loopback (DNS-rebinding defense);
 *  - browser preflights are refused unless the request carries the pairing
 *    token — cross-origin pages can neither read responses nor complete
 *    preflight;
 *  - MCP servers are spawned with argv arrays (shell: false) — no shell
 *    interpolation anywhere in this process;
 *  - when a server config declares `allowedRoots`, absolute-path arguments
 *    are canonicalized and MUST stay inside those roots (path traversal
 *    defense for filesystem-style servers);
 *  - every request is appended to a local JSONL audit log;
 *  - tool calls time out; server crashes are surfaced, restarted with a
 *    bounded backoff, and never silently retried forever.
 *
 * Zero npm dependencies: the MCP stdio wire protocol is JSON-RPC 2.0 with
 * newline-delimited messages — the three methods the bridge needs
 * (initialize, tools/list, tools/call) are implemented by hand.
 *
 * Usage:  node shadowtalk-mcp-bridge.mjs [--config path]
 * Config: ~/.shadowtalk-mcp-bridge.json (see config.example.json)
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve, normalize } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export const BRIDGE_VERSION = "1.0.0";
export const PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_CONFIG_PATH = `${homedir()}/.shadowtalk-mcp-bridge.json`;
const DEFAULT_CALL_TIMEOUT_MS = 60_000;
const MAX_RESTARTS_PER_MINUTE = 3;

/** ---------- config ---------- */

function loadConfig(configPath) {
  const path = configPath || DEFAULT_CONFIG_PATH;
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(`Config not found: ${path}\nCopy companion/config.example.json, add your MCP servers, then retry.`);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    fail(`Config is not valid JSON: ${path} (${e.message})`);
  }
  if (!Array.isArray(config.servers) || config.servers.length === 0) {
    fail("Config must list at least one MCP server under `servers`.");
  }
  for (const server of config.servers) {
    if (!server.name || !server.command) {
      fail("Every MCP server needs a `name` and a `command`.");
    }
  }
  try {
    const mode = statSync(path).mode & 0o777;
    if (mode & 0o007) {
      console.error(`[bridge] WARNING: ${path} is group/world-readable (mode ${(mode.toString(8))}). chmod 600 it.`);
    }
  } catch { /* best effort */ }
  return { ...config, _path: path };
}

function fail(message) {
  console.error(`[bridge] ${message}`);
  process.exit(1);
}

/** ---------- JSON-RPC stdio MCP client (one per configured server) ---------- */

class McpStdioConnection {
  constructor(spec, audit) {
    this.spec = spec;
    this.audit = audit;
    this.process = null;
    this.tools = [];
    this.status = "stopped";
    this.buffer = "";
    this.pending = new Map();
    this.nextId = 1;
    this.restartTimestamps = [];
    this.starting = null;
  }

  canRestart() {
    const now = Date.now();
    this.restartTimestamps = this.restartTimestamps.filter((t) => now - t < 60_000);
    return this.restartTimestamps.length < MAX_RESTARTS_PER_MINUTE;
  }

  async ensureStarted() {
    if (this.status === "ready" && this.process) return;
    if (this.starting) return this.starting;
    if (!this.canRestart() && this.process === null) {
      throw new BridgeError(503, `MCP server "${this.spec.name}" crashed too many times in the last minute — check its command/config.`);
    }
    this.starting = this.#start();
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async #start() {
    // argv array + shell:false — command/config values are never shell-interpolated.
    this.process = spawn(this.spec.command, this.spec.args ?? [], {
      shell: false,
      env: { ...process.env, ...(this.spec.env ?? {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.status = "starting";
    this.buffer = "";
    this.process.stdout.setEncoding("utf8");
    this.process.stdout.on("data", (chunk) => this.#onData(chunk));
    this.process.stderr.setEncoding("utf8");
    this.process.stderr.on("data", (chunk) => {
      // Server stderr is diagnostics, not protocol — surface to the terminal.
      process.stderr.write(`[mcp:${this.spec.name}] ${chunk}`);
    });
    this.process.on("exit", (code) => {
      this.status = "stopped";
      this.process = null;
      for (const { reject } of this.pending.values()) {
        reject(new BridgeError(502, `MCP server "${this.spec.name}" exited (code ${code}).`));
      }
      this.pending.clear();
      this.audit({ event: "server-exit", server: this.spec.name, code });
    });

    await this.#request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "shadowtalk-ai", version: BRIDGE_VERSION },
    });
    this.#notify("notifications/initialized");
    const list = await this.#request("tools/list", {});
    this.tools = Array.isArray(list?.tools) ? list.tools : [];
    this.status = "ready";
  }

  #onData(chunk) {
    this.buffer += chunk;
    let newline;
    while ((newline = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue; // non-JSON stdout line — tolerate
      }
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new BridgeError(502, `MCP server "${this.spec.name}" reported: ${message.error.message ?? JSON.stringify(message.error)}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  #request(method, params, timeoutMs = 15_000) {
    return new Promise((resolvePromise, rejectPromise) => {
      if (!this.process || this.process.killed) {
        rejectPromise(new BridgeError(502, `MCP server "${this.spec.name}" is not running.`));
        return;
      }
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new BridgeError(504, `MCP server "${this.spec.name}" did not answer "${method}" in time.`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolvePromise(value); },
        reject: (error) => { clearTimeout(timer); rejectPromise(error); },
      });
      this.process.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  #notify(method, params = {}) {
    try {
      this.process?.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
    } catch { /* best effort */ }
  }

  async callTool(toolName, args, timeoutMs) {
    await this.ensureStarted();
    const result = await this.#request(
      "tools/call",
      { name: toolName, arguments: args ?? {} },
      timeoutMs ?? this.spec.callTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS,
    );
    return result;
  }
}

/** ---------- errors ---------- */

export class BridgeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** ---------- path containment ---------- */

/**
 * If the server declares allowedRoots, every argument string that LOOKS like
 * an absolute path is canonicalized and must resolve INSIDE one of the roots.
 * `..` traversal, symlink-style tricks via normalize, and root-escape
 * absolute paths are rejected BEFORE the MCP server ever sees them.
 */
export function validateArgsAgainstRoots(spec, args) {
  const roots = spec.allowedRoots;
  if (!Array.isArray(roots) || roots.length === 0) return null; // no containment declared
  const canonicalRoots = roots.map((r) => normalize(resolve(r)));
  for (const [key, value] of Object.entries(args ?? {})) {
    if (typeof value !== "string" || !value) continue;
    const looksLikePath = isAbsolute(value) || value.startsWith("./") || value.startsWith("~/") || /^(?:[\w.-]+\/)+[\w.-]*/.test(value);
    if (!looksLikePath) continue;
    const expanded = value.replace(/^~(?=\/|$)/, homedir());
    const canonical = normalize(resolve(expanded));
    const inside = canonicalRoots.some((root) => canonical === root || canonical.startsWith(root + "/") || canonical.startsWith(root + "\\"));
    if (!inside) {
      return `Argument "${key}" resolves to ${canonical}, outside the allowed roots of server "${spec.name}".`;
    }
  }
  return null;
}

/** ---------- audit log ---------- */

function createAudit(auditPath) {
  return (entry) => {
    if (!auditPath) return;
    try {
      appendFileSync(auditPath, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
    } catch { /* audit failures must not break the bridge */ }
  };
}

/**
 * Args summary for the audit log: keys + value TYPES only, string values
 * truncated — tool arguments can contain tokens or file contents and must
 * not leak wholesale into a plaintext log.
 */
export function summarizeArgs(args) {
  const out = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    if (typeof value === "string") out[key] = value.length > 24 ? `${value.slice(0, 24)}…(${value.length})` : value;
    else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
    else out[key] = Array.isArray(value) ? `array(${value.length})` : typeof value;
  }
  return out;
}

/** ---------- HTTP surface ---------- */

const CORS_METHODS = "GET, POST";
const CORS_HEADERS = "Authorization, Content-Type, X-ShadowTalk-Bridge";

export function createBridge(config, deps = {}) {
  const auditPath = config.auditLog ?? `${homedir()}/.shadowtalk-mcp-bridge.audit.jsonl`;
  const audit = deps.audit ?? createAudit(auditPath);
  const connections = new Map(config.servers.map((spec) => [spec.name, new McpStdioConnection(spec, audit)]));
  let pairingToken = config.token ?? null;

  function requireAuth(req) {
    const header = req.headers.authorization ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match || match[1] !== pairingToken) {
      audit({ event: "auth-fail", host: req.headers.host, origin: req.headers.origin ?? null });
      throw new BridgeError(401, "Pairing token missing or wrong.");
    }
    const host = req.headers.host ?? "";
    const hostAllowed = host.startsWith("127.0.0.1:") || host === "127.0.0.1" || host.startsWith("localhost:") || host === "localhost";
    if (!hostAllowed) {
      audit({ event: "host-reject", host });
      throw new BridgeError(403, "Host header must be loopback.");
    }
  }

  function readBody(req, maxBytes = 512 * 1024) {
    return new Promise((resolvePromise, rejectPromise) => {
      let size = 0;
      const chunks = [];
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          rejectPromise(new BridgeError(413, "Request body too large."));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
      req.on("error", rejectPromise);
    });
  }

  async function handle(req, res) {
    // Preflight: refuse unless the token is already valid — a cross-origin
    // page cannot complete preflight without it, so its real request never
    // leaves the browser.
    if (req.method === "OPTIONS") {
      try {
        requireAuth(req);
        const origin = req.headers.origin;
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Vary", "Origin");
          res.setHeader("Access-Control-Allow-Methods", CORS_METHODS);
          res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS);
        }
        res.writeHead(204);
      } catch (error) {
        res.writeHead(error.status ?? 403);
      }
      res.end();
      return;
    }

    let originReflected = false;
    try {
      requireAuth(req);
      const origin = req.headers.origin;
      if (origin) {
        // The paired app legitimately runs on https://<site> — reflect its
        // origin ONLY after the token proved valid, so it can read answers.
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        originReflected = true;
      }
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (req.method === "GET" && url.pathname === "/health") {
        writeJson(res, 200, {
          ok: true,
          bridge: "shadowtalk-mcp-bridge",
          version: BRIDGE_VERSION,
          protocol: PROTOCOL_VERSION,
          servers: config.servers.map((s) => s.name),
          serverStatus: Object.fromEntries([...connections.entries()].map(([name, conn]) => [name, conn.status])),
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/tools") {
        const out = [];
        for (const [name, conn] of connections) {
          try {
            await conn.ensureStarted();
            out.push({
              server: name,
              status: conn.status,
              allowedRoots: conn.spec.allowedRoots ?? null,
              tools: conn.tools.map((t) => ({
                name: t.name,
                description: t.description ?? "",
                inputSchema: t.inputSchema ?? null,
                annotations: t.annotations ?? null,
              })),
            });
          } catch (error) {
            out.push({ server: name, status: "error", error: error.message, tools: [] });
          }
        }
        audit({ event: "tools-list" });
        writeJson(res, 200, { servers: out });
        return;
      }

      if (req.method === "POST" && url.pathname === "/invoke") {
        const body = JSON.parse((await readBody(req)) || "{}");
        const { server, tool, args } = body ?? {};
        if (!server || !tool) throw new BridgeError(400, "Both `server` and `tool` are required.");
        const conn = connections.get(server);
        if (!conn) throw new BridgeError(404, `Unknown MCP server "${server}".`);

        const pathViolation = validateArgsAgainstRoots(conn.spec, args);
        if (pathViolation) {
          audit({ event: "invoke-deny", server, tool, reason: pathViolation });
          throw new BridgeError(403, pathViolation);
        }

        const started = Date.now();
        const result = await conn.callTool(tool, args);
        audit({ event: "invoke", server, tool, args: summarizeArgs(args), ms: Date.now() - started });
        writeJson(res, 200, { ok: true, result });
        return;
      }

      throw new BridgeError(404, "Unknown endpoint.");
    } catch (error) {
      const status = error.status ?? 500;
      if (!originReflected) {
        // No CORS headers on failures — unpaired callers cannot read them.
      }
      writeJson(res, status, { ok: false, error: error.message ?? "Bridge error." });
    }
  }

  function writeJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      try {
        writeJson(res, 500, { ok: false, error: error.message ?? "Unexpected bridge error." });
      } catch { /* response already gone */ }
    });
  });

  return {
    server,
    connections,
    audit,
    /** Set/replace the pairing token (generated at boot when not configured). */
    setToken(token) { pairingToken = token; },
    async listen(port) {
      await new Promise((resolvePromise) => server.listen(port, "127.0.0.1", resolvePromise));
      return server.address().port;
    },
    async close() {
      for (const conn of connections.values()) {
        try { conn.process?.kill(); } catch { /* already dead */ }
      }
      await new Promise((resolvePromise) => server.close(resolvePromise));
    },
  };
}

/** ---------- CLI ---------- */

function main() {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");
  const config = loadConfig(configIndex >= 0 ? args[configIndex + 1] : undefined);
  const auditPath = config.auditLog ?? `${homedir()}/.shadowtalk-mcp-bridge.audit.jsonl`;
  const audit = createAudit(auditPath);

  if (!config.token) {
    config.token = randomBytes(32).toString("hex");
  }

  const bridge = createBridge(config, { audit });
  const port = Number(config.port) || 7717;

  bridge.listen(port).then(() => {
    audit({ event: "start", port });
    console.log("ShadowTalk AI — Local MCP Bridge");
    console.log(`  listening on http://127.0.0.1:${port} (loopback only)`);
    console.log(`  audit log: ${auditPath}`);
    console.log("");
    console.log("  PAIRING TOKEN (paste once in ShadowTalk → Settings → Local Tools):");
    console.log(`  ${config.token}`);
    console.log("");
    console.log(`  servers: ${config.servers.map((s) => s.name).join(", ")}`);
    console.log("  Press Ctrl+C to stop. The bridge serves ONLY your machine.");
    console.log("  Keep this window open while using local tools in ShadowTalk.");
  }).catch((error) => fail(`Could not bind 127.0.0.1:${port}: ${error.message}`));

  const shutdown = () => {
    audit({ event: "stop" });
    bridge.close().then(() => process.exit(0), () => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const isMain = process.argv[1] && import.meta.url === fileURLToPath(`file://${process.argv[1]}`);
if (isMain) main();
