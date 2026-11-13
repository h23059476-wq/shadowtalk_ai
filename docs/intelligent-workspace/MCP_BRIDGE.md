# Native MCP Bridge

> Batch 3 of the Intelligent Workspace initiative. Architecture context: `ARCHITECTURE.md`.

## Why a companion process

ShadowTalk is a browser app — a web page cannot inspect local software, and no desktop shell ships (`window.shadowtalkDesktop` is a typed contract without a shell). Pretending otherwise would be a fake UI. The shipped design: the user runs a **zero-dependency Node ≥ 18 companion** (`companion/shadowtalk-mcp-bridge.mjs`) on their machine; it spawns their configured MCP servers as stdio subprocesses and exposes them to the paired browser tab over a loopback-only HTTP JSON-RPC API.

## Companion (`companion/`)

- Wire protocol: MCP stdio = newline-delimited JSON-RPC 2.0; the three methods the bridge needs (`initialize`, `tools/list`, `tools/call`) implemented by hand — no npm dependencies.
- Config `~/.shadowtalk-mcp-bridge.json` (mode 0600 warning): servers (`name`, `command`, `args`, `env`, `callTimeoutMs`, `allowedRoots`), port (default 7717), optional fixed token, audit log path. See `companion/config.example.json` + `companion/README.md`.
- Security:
  - binds **127.0.0.1 only**; `Host` header must be loopback (DNS-rebinding defense);
  - pairing token (generated at boot, printed in the terminal) required on EVERY request;
  - browser preflights refused without the token → a cross-origin page can complete neither preflight nor invocation, and gets no CORS grant to read anything;
  - MCP servers spawn via argv arrays with `shell: false` — no shell interpolation anywhere in the bridge;
  - `allowedRoots` path containment: absolute-path arguments canonicalized and forced inside declared roots BEFORE reaching the MCP server (traversal chains rejected);
  - tool-call timeout (default 60 s); crashed servers surface honestly (`status: stopped`, 502) and restart with a bounded backoff (≤ 3/min);
  - JSONL audit log: auth failures, host rejections, invocations (args summarized to keys + value types, strings truncated), denials, server exits.

## Browser client (`src/lib/mcpBridge/`)

- Pairing persistence per user (localStorage, same trust domain as BYOK keys — disclosed in SECURITY_MODEL.md). Pairing happens ONLY when the user pastes the token in Settings → Local Tools. Nothing auto-connects.
- `McpBridgeClient.health/listServers/invoke` with typed errors (network / unauthorized / forbidden / not-found / server / timeout); loopback-only URL enforcement client-side too.
- **Permissions** (`permissions.ts`): categories derived from MCP annotations — `readOnlyHint → read-only`, `destructiveHint → write`, unknown → write (conservative), execution-shaped names → `execute`. Discovery grants NOTHING; every tool starts at ask-every-use. Read-only tools may be allowed-always (revocable); write/execute ALWAYS prompt — `saveGrant` refuses persistent sensitive grants, and hand-edited storage is stripped on load.
- **Intent-based invocation** (`intent.ts`): deterministic message→tool matcher (name-token overlap 0.6 + description overlap 0.4, threshold 0.5); ambiguous requests return null (a question, not a wrong tool call). `extractArgsFromMessage` fills only schema-declared string properties that appear in the message — never invents complex args.
- **Chat flow**: message → authorized tools → match → permission gate → (approval dialog for sensitive) → invoke → result rendered through the existing `toolExecution` card pipeline (`local:server/tool`), failure paths explained in-chat, activity recorded client-side (ring buffer, last 50).
- Audit/revocation: Settings → Local Tools shows per-tool switches, recent activity, disconnect (revokes pairing token client-side; restart the companion or rotate its token to fully revoke server-side).

## Known limitations (honest)

- The bridge trusts configured MCP servers; it does not sandbox them. Prefer `allowedRoots` for filesystem servers.
- Only the three MCP methods needed by chat are implemented (no resources/prompts).
- The companion audit log is a plaintext file (contents summarized, not redacted cryptographically).
- Approval for read-only tools can be remembered per tool; write/execute prompts EVERY use by design.
