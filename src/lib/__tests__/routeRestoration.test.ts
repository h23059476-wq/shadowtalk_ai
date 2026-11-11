/**
 * Regression tests for restored routes: /ide, /downloads, /security.
 * Verifies these routes are NOT redirects and point to real page components.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const appTsxPath = path.resolve(__dirname, "../../App.tsx");
const appSource = fs.readFileSync(appTsxPath, "utf-8");

describe("Restored Routes", () => {
  describe("/ide route", () => {
    it("is NOT a redirect to /chatbot", () => {
      const ideLine = appSource.match(/<Route path="\/ide" element=\{[\s\S]*?\}\s*\/>/);
      expect(ideLine).toBeDefined();
      expect(ideLine![0]).not.toContain("Navigate");
      expect(ideLine![0]).not.toContain("/chatbot");
    });

    it("renders AgenticIdePage", () => {
      const ideLine = appSource.match(/<Route path="\/ide" element=\{[\s\S]*?\}\s*\/>/);
      expect(ideLine).toBeDefined();
      expect(ideLine![0]).toContain("AgenticIdePage");
    });

    it("AgenticIdePage.tsx file exists", () => {
      const pagePath = path.resolve(__dirname, "../../pages/AgenticIdePage.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe("/downloads route", () => {
    it("is NOT a redirect to /chatbot", () => {
      const dlLine = appSource.match(/<Route path="\/downloads" element=\{[\s\S]*?\}\s*\/>/);
      expect(dlLine).toBeDefined();
      expect(dlLine![0]).not.toContain("Navigate");
      expect(dlLine![0]).not.toContain("/chatbot");
    });

    it("renders DownloadPage", () => {
      const dlLine = appSource.match(/<Route path="\/downloads" element=\{[\s\S]*?\}\s*\/>/);
      expect(dlLine).toBeDefined();
      expect(dlLine![0]).toContain("DownloadPage");
    });

    it("DownloadPage.tsx file exists", () => {
      const pagePath = path.resolve(__dirname, "../../pages/DownloadPage.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe("/security route", () => {
    it("is NOT a redirect to /chatbot", () => {
      const secLine = appSource.match(/<Route path="\/security" element=\{[\s\S]*?\}\s*\/>/);
      expect(secLine).toBeDefined();
      expect(secLine![0]).not.toContain("Navigate");
      expect(secLine![0]).not.toContain("/chatbot");
    });

    it("renders TrustPage", () => {
      const secLine = appSource.match(/<Route path="\/security" element=\{[\s\S]*?\}\s*\/>/);
      expect(secLine).toBeDefined();
      expect(secLine![0]).toContain("TrustPage");
    });

    it("TrustPage.tsx file exists", () => {
      const pagePath = path.resolve(__dirname, "../../pages/TrustPage.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe("Essential routes remain accessible", () => {
    it("/chatbot route exists and is not a redirect", () => {
      const line = appSource.match(/<Route path="\/chatbot" element=\{[\s\S]*?\}\s*\/>/);
      expect(line).toBeDefined();
      expect(line![0]).not.toContain("Navigate");
    });

    it("/shadow-twin route exists and is not a redirect", () => {
      const line = appSource.match(/<Route path="\/shadow-twin" element=\{[\s\S]*?\}\s*\/>/);
      expect(line).toBeDefined();
      expect(line![0]).not.toContain("Navigate");
    });

    it("/benchmarks route exists and is not a redirect", () => {
      const line = appSource.match(/<Route path="\/benchmarks" element=\{[\s\S]*?\}\s*\/>/);
      expect(line).toBeDefined();
      expect(line![0]).not.toContain("Navigate");
    });

    it("/t/:username route exists for public twin chat", () => {
      const line = appSource.match(/<Route path="\/t\/:username" element=\{[\s\S]*?\}\s*\/>/);
      expect(line).toBeDefined();
      expect(line![0]).not.toContain("Navigate");
    });
  });

  describe("Slash command /ide", () => {
    it("exists in slashCommands.ts", () => {
      const slashPath = path.resolve(__dirname, "../../lib/slashCommands.ts");
      const slashSource = fs.readFileSync(slashPath, "utf-8");
      expect(slashSource).toContain('command: "/ide"');
      expect(slashSource).toContain("Open Code IDE");
    });
  });

  describe("DocsPage links to /security", () => {
    it("DocsPage contains a link to /security", () => {
      const docsPath = path.resolve(__dirname, "../../pages/DocsPage.tsx");
      const docsSource = fs.readFileSync(docsPath, "utf-8");
      expect(docsSource).toContain('href="/security"');
    });
  });

  describe("Sitemap contains restored routes", () => {
    const sitemapPath = path.resolve(__dirname, "../../../public/sitemap.xml");
    const sitemap = fs.readFileSync(sitemapPath, "utf-8");

    it("/ide is in sitemap", () => {
      expect(sitemap).toContain("shadowtalk-ai.com/ide</loc>");
    });

    it("/downloads is in sitemap", () => {
      expect(sitemap).toContain("shadowtalk-ai.com/downloads</loc>");
    });

    it("/security is in sitemap", () => {
      expect(sitemap).toContain("shadowtalk-ai.com/security</loc>");
    });

    it("redirected routes are NOT in sitemap", () => {
      const redirectedRoutes = ["/anonymous-ai", "/answers", "/discover", "/enterprise",
        "/founder-access", "/knowledge-graph", "/marketplace", "/partnerships",
        "/privacy-score", "/referral", "/sessions", "/shadow-memory", "/studio",
        "/templates", "/workspace", "/computer", "/research", "/developers"];
      for (const route of redirectedRoutes) {
        expect(sitemap).not.toContain(`shadowtalk-ai.com${route}</loc>`);
      }
    });
  });
});
