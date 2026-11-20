import { describe, expect, it } from "vitest";
import {
  buildIdeAgentSystemPrompt,
  buildWorkspaceContext,
  inferLanguageFromName,
  normalizePath,
  parseAgentResponse,
} from "../agentProtocol";

describe("buildIdeAgentSystemPrompt", () => {
  it("agent mode teaches the file-path fence contract and SVG rule", () => {
    const prompt = buildIdeAgentSystemPrompt("agent");
    expect(prompt).toContain("path=app.js");
    expect(prompt).toContain("```svg");
    expect(prompt).toContain("COMPLETE file content");
  });

  it("ask mode forbids file-path fences", () => {
    const prompt = buildIdeAgentSystemPrompt("ask");
    expect(prompt).toContain("Ask mode");
    expect(prompt).not.toContain("path=app.js");
  });
});

describe("buildWorkspaceContext", () => {
  it("embeds file blocks and the active file focus", () => {
    const ctx = buildWorkspaceContext("add a button", [
      { name: "index.html", language: "html", content: "<h1>hi</h1>" },
      { name: "app.js", language: "javascript", content: "console.log(1)" },
    ], "app.js");
    expect(ctx).toContain("=== FILE: index.html (html) ===");
    expect(ctx).toContain("WORKSPACE (2 files)");
    expect(ctx).toContain("currently editing: app.js");
    expect(ctx).toContain("TASK:\nadd a button");
  });

  it("handles an empty workspace", () => {
    const ctx = buildWorkspaceContext("start fresh", []);
    expect(ctx).toContain("WORKSPACE (0 files)");
    expect(ctx).not.toContain("=== FILE:");
  });

  it("truncates oversized files", () => {
    const ctx = buildWorkspaceContext("t", [
      { name: "big.js", language: "javascript", content: "x".repeat(30_000) },
    ]);
    expect(ctx).toContain("[truncated 6000 chars]");
  });
});

describe("parseAgentResponse", () => {
  const files = ["index.html", "app.js"];

  it("splits prose, file blocks and code blocks", () => {
    const reply = [
      "Here is my plan: add a counter.",
      "```html path=index.html",
      "<h1>Counter</h1>",
      "```",
      "And the script:",
      "```js path=app.js",
      "console.log(1)",
      "```",
    ].join("\n");
    const { segments, changes } = parseAgentResponse(reply, files);

    expect(segments.map((s) => s.type)).toEqual(["text", "file", "text", "file"]);
    expect(changes).toHaveLength(2);
    expect(changes[0]).toMatchObject({ path: "index.html", content: "<h1>Counter</h1>", isNew: false });
    expect(changes[1]).toMatchObject({ path: "app.js", isNew: false });
  });

  it("marks unknown paths as new files", () => {
    const reply = "new util\n```js path=utils/helpers.js\nexport const one = 1;\n```\ndone";
    const { changes } = parseAgentResponse(reply, files);
    expect(changes[0].isNew).toBe(true);
    expect(changes[0].path).toBe("utils/helpers.js");
  });

  it("last block wins per path", () => {
    const reply = [
      "```js path=app.js",
      "v1",
      "```",
      "oops, fixed:",
      "```js path=app.js",
      "v2",
      "```",
    ].join("\n");
    const { changes } = parseAgentResponse(reply, files);
    expect(changes).toHaveLength(1);
    expect(changes[0].content).toBe("v2");
  });

  it("accepts file= alias and quotes", () => {
    const reply = '```css file="style.css"\nbody { color: red; }\n```';
    const { changes } = parseAgentResponse(reply, ["style.css"]);
    expect(changes[0]).toMatchObject({ path: "style.css", isNew: false });
  });

  it("normalizes ./ and leading / paths", () => {
    expect(normalizePath("./app.js")).toBe("app.js");
    expect(normalizePath("/app.js")).toBe("app.js");
    expect(normalizePath("../escape.js")).toBe("");
    expect(normalizePath("")).toBe("");
  });

  it("turns plain svg fences into image segments via validateSvg", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#123"/></svg>';
    const reply = `drawing:\n\`\`\`svg\n${svg}\n\`\`\``;
    const { segments, changes } = parseAgentResponse(reply, files);
    expect(segments[1]).toMatchObject({ type: "image", width: 120, height: 60 });
    expect(changes).toHaveLength(0);
  });

  it("keeps invalid svg as a code segment", () => {
    const reply = '```svg\n<svg width="10"><script>alert(1)</script></svg>\n```';
    const { segments } = parseAgentResponse(reply, files);
    expect(segments[0]).toMatchObject({ type: "code", language: "svg" });
  });

  it("streaming-safe: unterminated trailing fence becomes code", () => {
    const reply = "writing…\n```js path=app.js\nconst x = 1;\nconst y = 2;";
    const { segments } = parseAgentResponse(reply, files);
    expect(segments[0]).toMatchObject({ type: "text", text: "writing…" });
    expect(segments[1]).toMatchObject({ type: "file", path: "app.js", content: "const x = 1;\nconst y = 2;" });
  });

  it("plain snippets stay code segments", () => {
    const reply = "use this:\n```js\nconsole.log('hi')\n```";
    const { segments, changes } = parseAgentResponse(reply, files);
    expect(segments[1]).toMatchObject({ type: "code", language: "js" });
    expect(changes).toHaveLength(0);
  });

  it("returns empty for prose-only replies", () => {
    const { segments, changes } = parseAgentResponse("Just an explanation, no code.", files);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("text");
    expect(changes).toHaveLength(0);
  });

  it("ignores malformed paths inside fences", () => {
    const reply = "```js path=../oops.js\nbad()\n```";
    const { segments, changes } = parseAgentResponse(reply, files);
    expect(changes).toHaveLength(0);
    expect(segments[0].type).toBe("code");
  });
});

describe("inferLanguageFromName", () => {
  it("maps common extensions", () => {
    expect(inferLanguageFromName("main.tsx")).toBe("typescript");
    expect(inferLanguageFromName("poster.SVG")).toBe("svg");
    expect(inferLanguageFromName("unknown.xyz")).toBe("plaintext");
  });
});
