/**
 * Intelligent Workspace Batch 3 (MCP Bridge) — intent-based tool matching.
 *
 * Maps a natural-language request onto an authorized tool WITHOUT any
 * provider function-calling roundtrip (ShadowTalk has none). Scoring is
 * deterministic: name-token overlap + description-token overlap + explicit
 * trigger keywords. A match below the threshold returns null — an ambiguous
 * request must produce a question, not a wrong tool call.
 */

import type { BridgeTool } from "@/lib/mcpBridge/types";

const GENERIC_TOKENS = new Set([
  "the", "a", "an", "my", "me", "please", "can", "you", "i", "to", "for", "of",
  "in", "on", "at", "is", "are", "what", "whats", "show", "tell", "give",
  "and", "with", "using", "use", "do", "does", "it", "this", "that", "latest",
  "current", "now", "check", "get", "list", "run", "make", "help",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_.-]+/i)
    .filter((t) => t.length > 1 && !GENERIC_TOKENS.has(t));
}

export interface ToolMatch {
  server: string;
  tool: BridgeTool;
  score: number;
  reason: string;
}

const MATCH_THRESHOLD = 0.5;

/**
 * @param tools authorized tools across servers: [{ server, tool }]
 * @returns best-scoring match above the threshold, or null.
 */
export function matchMessageToTool(
  message: string,
  tools: Array<{ server: string; tool: BridgeTool }>,
): ToolMatch | null {
  const messageTokens = new Set(tokens(message));
  if (messageTokens.size === 0) return null;

  let best: ToolMatch | null = null;
  for (const { server, tool } of tools) {
    const nameTokens = tokens(tool.name.replace(/[_-]+/g, " "));
    const descTokens = tokens(tool.description ?? "");

    let nameHits = 0;
    for (const token of nameTokens) {
      if (messageTokens.has(token)) nameHits += 1;
      else if (messageTokens.size > 0) {
        // Partial stem match (e.g. "branch" in "branches")
        for (const messageToken of messageTokens) {
          if (token.startsWith(messageToken) || messageToken.startsWith(token)) {
            nameHits += 0.5;
            break;
          }
        }
      }
    }
    let descHits = 0;
    for (const token of descTokens) {
      if (messageTokens.has(token)) descHits += 1;
    }

    const nameScore = nameTokens.length > 0 ? nameHits / nameTokens.length : 0;
    const descScore = descTokens.length > 0 ? Math.min(1, descHits / Math.max(2, Math.min(descTokens.length, 6))) : 0;
    const score = nameScore * 0.6 + descScore * 0.4;

    if (score > MATCH_THRESHOLD && (!best || score > best.score)) {
      const matchedName = nameTokens.filter((t) => messageTokens.has(t)).join(", ");
      best = {
        server,
        tool,
        score,
        reason: matchedName
          ? `matched tool name (${matchedName})`
          : `matched description (${[...messageTokens].filter((t) => descTokens.includes(t)).slice(0, 3).join(", ")})`,
      };
    }
  }
  return best;
}

/**
 * Extract simple string arguments for a tool call from the message using the
 * tool's input schema (string/number/boolean properties). ONLY fills obvious
 * values: a property whose name appears in the message followed by a value
 * ("in /home/user/repo") — never invents content. Complex args stay empty
 * and the UI asks the user to confirm/complete them.
 */
export function extractArgsFromMessage(
  message: string,
  tool: BridgeTool,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const schema = tool.inputSchema as { properties?: Record<string, { type?: string }> } | null | undefined;
  const properties = schema?.properties ?? {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop?.type !== "string") continue;
    // "key: value" or "key value" patterns (key matched as a whole word)
    const pattern = new RegExp(`(?:^|\\s)${key.replace(/[_-]*/g, "[_ -]?")}[:\\s]+("[^"]+"|'[^']+'|[^\\s,;]+)`, "i");
    const match = pattern.exec(message);
    if (match) {
      args[key] = match[1].replace(/^["']|["']$/g, "");
    }
  }
  return args;
}
