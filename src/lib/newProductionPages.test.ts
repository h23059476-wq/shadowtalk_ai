import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PAGE_SEO } from "./seo";

const pagesDir = path.resolve(__dirname, "../pages");
const appTsxPath = path.resolve(__dirname, "../App.tsx");

describe("Production Pages Verification", () => {
  // Note: StatusPage was removed in the v3.0.0 architecture pivot.
  // The remaining 9 pages are the current production set.
  const targetPages = [
    { route: "/contact", file: "ContactPage.tsx", seoKey: "contact" },
    { route: "/help", file: "HelpCenterPage.tsx", seoKey: "help" },
    { route: "/faq", file: "FAQPage.tsx", seoKey: "faq" },
    { route: "/blog", file: "BlogPage.tsx", seoKey: "blog" },
    { route: "/case-studies", file: "CaseStudiesPage.tsx", seoKey: "caseStudies" },
    { route: "/gdpr", file: "GDPRPage.tsx", seoKey: "gdpr" },
    { route: "/cookies", file: "CookiePolicyPage.tsx", seoKey: "cookies" },
    { route: "/terms", file: "TermsOfServicePage.tsx", seoKey: "terms" },
    { route: "/privacy", file: "PrivacyPolicyPage.tsx", seoKey: "privacy" },
  ];

  it("all page source files exist and have substantial production content", () => {
    for (const page of targetPages) {
      const filePath = path.join(pagesDir, page.file);
      expect(fs.existsSync(filePath), `File ${page.file} should exist`).toBe(true);

      const content = fs.readFileSync(filePath, "utf-8");
      // Verify not a placeholder/stub
      expect(content.length).toBeGreaterThan(2000);
      expect(content).toContain("SEOHead");
      expect(content).toContain("Navigation");
      expect(content).toContain("Footer");
      expect(content).toContain("Back to Chatbot");
    }
  });

  it("all routes are registered in App.tsx", () => {
    const appSource = fs.readFileSync(appTsxPath, "utf-8");
    for (const page of targetPages) {
      expect(appSource).toContain(`path="${page.route}"`);
    }
  });

  it("all 10 pages have complete SEOHead metadata in seo.ts", () => {
    for (const page of targetPages) {
      const seo = (PAGE_SEO as Record<string, any>)[page.seoKey];
      expect(seo, `SEO config for ${page.seoKey} should exist`).toBeDefined();
      expect(seo.title).toBeTruthy();
      expect(seo.description).toBeTruthy();
      expect(seo.keywords?.length).toBeGreaterThan(3);
    }
  });
});
