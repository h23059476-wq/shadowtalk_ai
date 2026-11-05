/**
 * Static chat-reliability contracts for ChatbotPage wiring that requires a
 * full page render to exercise. Pins the patterns that guarantee:
 * - in-flight streams abort on unmount
 * - private-mode messages are never persisted as plaintext
 * - truncated mid-stream responses are never silently saved
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("chat reliability source contracts", () => {
  it("ChatbotPage aborts in-flight requests on unmount", () => {
    const src = read("src/pages/ChatbotPage.tsx");
    expect(src).toMatch(/useEffect\(\(\) => \{\s*return \(\) => \{\s*abortControllerRef\.current\?\.abort\(\);/);
  });

  it("saveMessage skips the DB write when private-mode encryption fails", () => {
    const src = read("src/pages/ChatbotPage.tsx");
    expect(src).toContain("if (contentToSave === null)");
    expect(src).toContain("message not persisted");
  });

  it("conversation creation falls back to local when the private title cannot be encrypted", () => {
    const src = read("src/pages/ChatbotPage.tsx");
    expect(src).toContain("if (titleToSave !== null)");
  });

  it("mid-stream failures with partial output are marked and never persisted", () => {
    const src = read("src/pages/ChatbotPage.tsx");
    const start = src.indexOf("if (cloudError && streamedContent) {");
    expect(start).toBeGreaterThan(-1);
    // Slice to the end of that branch (the next top-level `if (streamedContent)`)
    const end = src.indexOf("if (streamedContent) {", start);
    const branch = src.slice(start, end);
    expect(branch).toContain("Response interrupted");
    expect(branch).toContain("Response incomplete");
    expect(branch).not.toContain("saveMessage(");
  });

  it("assistant messages are only saved after a clean stream", () => {
    const src = read("src/pages/ChatbotPage.tsx");
    const cleanBranch = src.indexOf("if (streamedContent) {\n        pushAssistant(streamedContent);\n      }");
    expect(cleanBranch).toBeGreaterThan(-1);
    const saveCall = src.indexOf('void saveMessage(assistantContent, "assistant"', cleanBranch);
    const errorBranch = src.indexOf("if (cloudError && streamedContent) {");
    expect(saveCall).toBeGreaterThan(cleanBranch);
    expect(errorBranch).toBeLessThan(cleanBranch);
  });

  it("cloudChat maps auth, quota, rate-limit and 5xx failures", () => {
    const src = read("src/lib/cloudChat.ts");
    expect(src).toContain("AI gateway authentication failed");
    expect(src).toContain("AI credits exhausted");
    expect(src).toContain("Rate limit reached");
    expect(src).toContain("AI service is temporarily unavailable");
    expect(src).not.toContain('message = message ||');
  });

  it("useGlobalChat wires its abort controller into send()", () => {
    const src = read("src/hooks/useGlobalChat.ts");
    expect(src).toContain("abortRef.current = controller;");
    expect(src).toMatch(/signal: controller\.signal/);
    expect(src).toContain('"Chat stopped."');
  });
});
