/**
 * Static security contracts for fixes that are impractical to exercise in a
 * DOM test (browser-only APIs / page-level wiring). Each test pins the exact
 * source pattern that closes a vulnerability — if a refactor reverts one,
 * CI fails with a pointer to the file.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("security source contracts", () => {
  it("main.tsx keeps the service worker registered (PWA/offline intact)", () => {
    const src = read("src/main.tsx");
    expect(src).toContain("registerSW({ immediate: true })");
    expect(src).not.toMatch(/getRegistrations\s*\(/);
    expect(src).not.toMatch(/registration\.unregister\s*\(/);
  });

  it("AgenticIdePage preview iframe never combines allow-scripts with allow-same-origin", () => {
    const src = read("src/pages/AgenticIdePage.tsx");
    const sandbox = src.match(/sandbox="([^"]*)"/);
    expect(sandbox).not.toBeNull();
    const tokens = sandbox![1].split(/\s+/);
    expect(tokens).toContain("allow-scripts");
    expect(tokens).not.toContain("allow-same-origin");
  });

  it("printWorldClassDocument escapes every metadata interpolation", () => {
    const src = read("src/lib/worldClassDocumentExport.ts");
    const start = src.indexOf("export function printWorldClassDocument");
    const nextExport = src.indexOf("export function", start + 10);
    const fn = src.slice(start, nextExport > 0 ? nextExport : undefined);
    expect(fn).toContain("${escape(meta.title)}");
    expect(fn).toContain("${escape(meta.subtitle)}");
    expect(fn).toContain('escape(options.author ||');
    expect(fn).toContain('escape(options.classification ||');
    expect(fn).toContain('escape(options.date ||');
    // No raw interpolations of the dangerous fields remain.
    expect(fn).not.toContain("${meta.title}");
    expect(fn).not.toContain("${meta.subtitle}");
    expect(fn).not.toContain("${options.author");
    expect(fn).not.toContain("${options.classification");
  });

  it("useE2EE reuses the persisted vault salt", () => {
    const src = read("src/hooks/useE2EE.ts");
    expect(src).toContain('localStorage.getItem("shadowtalk_e2e_salt")');
    // The init effect must attempt to restore the stored salt before generating.
    const getItemIdx = src.indexOf('localStorage.getItem("shadowtalk_e2e_salt")');
    const effectIdx = src.indexOf("// Initialize vault salt");
    expect(getItemIdx).toBeGreaterThan(effectIdx);
  });

  it("useApiKeyValidation authenticates Anthropic with x-api-key + version header", () => {
    const src = read("src/hooks/useApiKeyValidation.ts");
    expect(src).toContain('"x-api-key"');
    expect(src).toContain('"anthropic-version"');
    expect(src).toContain("https://api.anthropic.com/v1/models");
  });

  it("BYOK storage stays in the per-user v2 namespace", () => {
    const src = read("src/lib/byok.ts");
    expect(src).toContain('"shadowtalk.byok.v2."');
    expect(src).not.toContain('"shadowtalk.byok.v1"');
  });

  it("resolveTurboKey no longer reads the legacy v1 key", () => {
    const src = read("src/lib/turbo/turboProviders.ts");
    // The code must not READ the legacy key (a doc comment mentioning it is fine).
    expect(src).not.toMatch(/localStorage\.getItem\(["'`]shadowtalk\.byok\.v1/);
    expect(src).toContain("getByokConfig");
  });
});
