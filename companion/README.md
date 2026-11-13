# ShadowTalk AI — Local MCP Bridge (companion)

ShadowTalk runs in your browser and cannot inspect your local software by
itself. This companion is the local host: you start it on your machine, it
launches the MCP servers you configured, and your paired ShadowTalk tab can
then discover and (with your explicit approval) invoke those tools.

**Zero npm dependencies** — any Node.js ≥ 18 can run it directly.

## Quick start

```bash
# 1. Copy the example config and point it at YOUR directories/servers:
cp companion/config.example.json ~/.shadowtalk-mcp-bridge.json
chmod 600 ~/.shadowtalk-mcp-bridge.json   # it may name private paths

# 2. Start the bridge (keep the window open while you use local tools):
node companion/shadowtalk-mcp-bridge.mjs

# 3. It prints a PAIRING TOKEN. In ShadowTalk:
#    Settings → Local Tools → paste http://127.0.0.1:7717 + the token → Pair
```

## Config

| Field | Meaning |
|---|---|
| `port` | Local port (default `7717`). Binds to `127.0.0.1` only — never exposed to your network. |
| `token` | Optional fixed pairing token; one is generated and printed each boot when absent. |
| `servers[]` | MCP stdio servers: `name`, `command`, `args`, optional `env`, `callTimeoutMs`. |
| `servers[].allowedRoots` | Filesystem containment: absolute-path arguments must resolve inside these roots. Set this for filesystem-style servers. |
| `auditLog` | JSONL audit file (default `~/.shadowtalk-mcp-bridge.audit.jsonl`). |

Popular MCP servers (installed on your machine, not bundled here):

- Filesystem: `npx -y @modelcontextprotocol/server-filesystem <dir>`
- Git: `uvx mcp-server-git --repository <repo>`
- PostgreSQL: `npx -y @modelcontextprotocol/server-postgres <conn-string>`

## What the bridge enforces

- Loopback-only bind; `Host` header must be `127.0.0.1`/`localhost` (DNS-rebinding defense).
- Pairing token required on every request, including health checks.
- Browser cross-origin pages cannot preflight (OPTIONS refused without the token), so they cannot invoke tools.
- MCP servers spawn with argv arrays, `shell: false` — no shell interpolation anywhere.
- `allowedRoots` path containment is validated before arguments reach an MCP server.
- Tool calls time out (default 60 s); crashed servers are surfaced, restarted with a bounded backoff, and every request/invoke/denial is appended to the audit log.

## Known limitations (honest)

- The bridge trusts the MCP servers you configure; it does not sandbox them. Pick servers you trust, and prefer `allowedRoots` for anything filesystem-touching.
- Only the three MCP methods the app needs are implemented: `initialize`, `tools/list`, `tools/call` (no resources/prompts yet).
- The audit log stores argument KEYS and value TYPES (string values truncated) — not full contents — but it is still a plaintext file on your disk.
