/**
 * ShadowTalk IDE agent protocol.
 *
 * The IDE agent is a conversational model call with workspace context. Its
 * replies mix prose with three kinds of fenced blocks the IDE can act on:
 *
 *   1. Full-file rewrites — an info string that carries the file path:
 *        ```js path=app.js        (also accepted: file=app.js)
 *        …complete file content…
 *        ```
 *
 *   2. Studio visuals — a ```shadowvisual JSON fence. The raw JSON is
 *      forwarded to ShadowVisualRenderer (ECharts / Mermaid / Bento engines,
 *      src/components/visual) which validates and renders it. Raw
 *      <svg>/<canvas> drawing is NOT part of this protocol — the model is
 *      forced through the JSON engines.
 *
 *   3. Plain code fences — rendered as code blocks.
 *
 * parseAgentResponse() splits a reply (streaming-safe: an unclosed trailing
 * fence is treated as code that is still being written) into renderable
 * segments and file changes the user can apply to the workspace.
 */

import { isShadowVisualFence } from "@/components/visual/visualContract";
import type { JulesWorkspaceFile } from "@/lib/jules/types";

// ── Segments ───────────────────────────────────────────────────────────

export type AgentSegment =
  | { type: "text"; text: string }
  | { type: "code"; language: string; content: string }
  | { type: "visual"; raw: string }
  | { type: "file"; path: string; language: string; content: string; isNew: boolean };

export interface ParsedAgentReply {
  segments: AgentSegment[];
  /** Every full-file block, in reply order (deduped by path, last wins). */
  changes: Array<{ path: string; content: string; language: string; isNew: boolean }>;
}

// ── System prompt ──────────────────────────────────────────────────────

const AGENT_RULES = `Reply format:
1. Start with a short plan or explanation (2–6 sentences, plain text).
2. For EVERY file you create or change, output ONE fenced code block whose info string carries the file path, containing the COMPLETE file content (never a partial diff):
   \`\`\`js path=app.js
   …full file content…
   \`\`\`
   - Edit an existing file by using its exact name; create a file by using a new name (e.g. path=utils/helpers.js).
   - Keep HTML/CSS/JS runnable in the browser with no build step.
3. Charts, diagrams, flowcharts, mind maps, infographics, comparisons, roadmaps and summary cards are NOT drawn by hand: output ONE fenced code block tagged shadowvisual containing PURE JSON (mode: chart | diagram | infographic). Data only — no colors, no SVG, no canvas; the studio engines style everything. For an SVG/poster ART asset, write it as a file block instead (path=poster.svg).
Be concise. Never restate whole files in prose.`;

export function buildIdeAgentSystemPrompt(mode: "agent" | "ask" = "agent"): string {
  if (mode === "ask") {
    return [
      "You are the ShadowTalk IDE assistant — a concise coding tutor embedded in the ShadowTalk in-browser IDE.",
      "The user is in Ask mode: explain, review and advise. Do NOT output fenced code blocks that carry file paths and do not rewrite files.",
      "Small illustrative snippets are fine.",
    ].join(" ");
  }
  return [
    "You are the ShadowTalk IDE Agent — an AI coding partner embedded in the ShadowTalk in-browser IDE.",
    "The user message contains the workspace snapshot as === FILE === blocks.",
    AGENT_RULES,
  ].join(" ");
}

// ── Workspace context ──────────────────────────────────────────────────

const MAX_FILE_CHARS = 24_000;
const MAX_TOTAL_CHARS = 100_000;

/** Embed IDE workspace files into the agent's user message. */
export function buildWorkspaceContext(
  task: string,
  files: JulesWorkspaceFile[],
  activeFileName?: string,
): string {
  let total = 0;
  const blocks: string[] = [];

  for (const file of files) {
    let content = file.content;
    if (content.length > MAX_FILE_CHARS) {
      content = `${content.slice(0, MAX_FILE_CHARS)}\n… [truncated ${content.length - MAX_FILE_CHARS} chars]`;
    }
    const block = `=== FILE: ${file.name} (${file.language ?? "text"}) ===\n${content}`;
    if (total + block.length > MAX_TOTAL_CHARS) break;
    blocks.push(block);
    total += block.length;
  }

  const focus = activeFileName ? `\nThe user is currently editing: ${activeFileName}\n` : "\n";

  return `WORKSPACE (${blocks.length} file${blocks.length === 1 ? "" : "s"}):${blocks.length ? `\n${blocks.join("\n\n")}\n` : " empty"}${focus}TASK:
${task.trim()}`;
}

// ── Parsing ────────────────────────────────────────────────────────────

const FENCE_RE = /```([^\n]*)\n([\s\S]*?)(?:```|$)/g;

/** Extract `path=` / `file=` from a fence info string. */
function readFencePath(info: string): string | null {
  const m = info.match(/\b(?:path|file)\s*=\s*["']?([^\s"'`]+)["']?/i);
  if (!m) return null;
  return normalizePath(m[1]);
}

export function normalizePath(raw: string): string {
  let p = raw.trim().replace(/^["']|["']$/g, "");
  p = p.replace(/^\.\//, "").replace(/^\//, "");
  if (p.includes("..") || p.length === 0) return "";
  return p;
}

function sanitizeLanguage(lang: string): string {
  const l = lang.toLowerCase();
  return /^[\w.+-]+$/.test(l) && l.length <= 24 ? l : "";
}

/**
 * Split an agent reply into segments.
 *
 * Streaming-safe: if the text ends inside an unterminated fence, that
 * trailing fence is emitted as a code segment (still being written) instead
 * of being swallowed. Full-file blocks carry `isNew` resolved against
 * `existingNames`.
 */
export function parseAgentResponse(
  text: string,
  existingNames: Iterable<string> = [],
): ParsedAgentReply {
  const existing = new Set(existingNames);
  const segments: AgentSegment[] = [];
  const changes: ParsedAgentReply["changes"] = [];
  const changeIndex = new Map<string, number>();

  let cursor = 0;
  FENCE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FENCE_RE.exec(text)) !== null) {
    const [full, info, body] = match;
    const fenceStart = match.index;

    if (fenceStart > cursor) {
      const prose = text.slice(cursor, fenceStart);
      if (prose.trim()) segments.push({ type: "text", text: prose.trim() });
    }

    const language = sanitizeLanguage((info || "").split(/\s+/)[0] || "");
    const content = body.replace(/\n$/, "");
    const fencePath = readFencePath(info || "");

    if (fencePath) {
      const seg: AgentSegment = {
        type: "file",
        path: fencePath,
        language: language || inferLanguageFromName(fencePath),
        content,
        isNew: !existing.has(fencePath),
      };
      segments.push(seg);
      const seenAt = changeIndex.get(fencePath);
      if (seenAt !== undefined) {
        changes[seenAt] = { path: fencePath, content, language: seg.language, isNew: seg.isNew };
      } else {
        changeIndex.set(fencePath, changes.length);
        changes.push({ path: fencePath, content, language: seg.language, isNew: seg.isNew });
      }
    } else if (language && isShadowVisualFence(language)) {
      // Studio visual — forwarded raw; ShadowVisualRenderer validates + renders.
      segments.push({ type: "visual", raw: content });
    } else if (language && content.trim()) {
      segments.push({ type: "code", language, content });
    } else if (content.trim()) {
      segments.push({ type: "code", language: "", content });
    }

    cursor = fenceStart + full.length;
    if (full.endsWith("```") === false) break; // unterminated trailing fence
  }

  if (cursor < text.length) {
    const prose = text.slice(cursor);
    if (prose.trim()) segments.push({ type: "text", text: prose.trim() });
  }

  return { segments, changes };
}

/** Best-effort language tag from a file name (mirrors the IDE editor). */
export function inferLanguageFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    html: "html", css: "css", json: "json", py: "python", md: "markdown",
    svg: "svg", txt: "plaintext", sh: "shell", yml: "yaml", yaml: "yaml",
  };
  return map[ext] || "plaintext";
}
