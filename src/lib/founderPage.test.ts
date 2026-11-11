import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PAGE_SEO } from "./seo";
import { CHAT_SIDEBAR_NAV } from "./chatSidebarNav";

const pagesDir = path.resolve(__dirname, "../pages");
const appTsxPath = path.resolve(__dirname, "../App.tsx");
const footerPath = path.resolve(__dirname, "../components/Footer.tsx");
const cmdPalettePath = path.resolve(__dirname, "../components/CommandPalette.tsx");

describe("Dedicated Founder Page Verification", () => {
  it("FounderPage.tsx exists and contains comprehensive production content", () => {
    const filePath = path.join(pagesDir, "FounderPage.tsx");
    expect(fs.existsSync(filePath), "FounderPage.tsx should exist").toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content.length).toBeGreaterThan(3000);
    expect(content).toContain("SEOHead");
    expect(content).toContain("Navigation");
    expect(content).toContain("Footer");
    expect(content).toContain("FOUNDER_FULL_NAME");
    expect(content).toContain("FOUNDER_STORY_CHAPTERS");
    expect(content).toContain("Karachi, Pakistan");
  });

  it("App.tsx registers /founder and alias routes", () => {
    const appSource = fs.readFileSync(appTsxPath, "utf-8");
    expect(appSource).toContain('path="/founder"');
    expect(appSource).toContain('path="/zain-ahmed"');
    expect(appSource).toContain('path="/zain-ahmed-fahad-patel"');
    expect(appSource).toContain("FounderPage");
  });

  it("PAGE_SEO has complete metadata for founder page", () => {
    const seo = (PAGE_SEO as Record<string, any>)["founder"];
    expect(seo, "PAGE_SEO.founder should exist").toBeDefined();
    expect(seo.title).toContain("Zain Ahmed Fahad Patel");
    expect(seo.description).toContain("Zain Ahmed");
    expect(seo.canonical).toBe("https://www.shadowtalk-ai.com/founder");
    expect(seo.keywords?.length).toBeGreaterThan(4);
  });

  it("CHAT_SIDEBAR_NAV links to /founder", () => {
    const founderItem = CHAT_SIDEBAR_NAV.find((item) => item.to === "/founder");
    expect(founderItem, "Sidebar navigation should contain Founder link").toBeDefined();
    expect(founderItem?.label).toBe("Founder");
  });

  it("Footer and CommandPalette link to /founder", () => {
    const footerSource = fs.readFileSync(footerPath, "utf-8");
    expect(footerSource).toContain('href: "/founder"');

    const cmdSource = fs.readFileSync(cmdPalettePath, "utf-8");
    expect(cmdSource).toContain('href: "/founder"');
  });

  it("FatimaPage.tsx exists and contains comprehensive production content", () => {
    const filePath = path.join(pagesDir, "FatimaPage.tsx");
    expect(fs.existsSync(filePath), "FatimaPage.tsx should exist").toBe(true);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content.length).toBeGreaterThan(3000);
    expect(content).toContain("SEOHead");
    expect(content).toContain("Navigation");
    expect(content).toContain("Footer");
    expect(content).toContain("COFOUNDER_FULL_NAME");
    expect(content).toContain("Fatima");
    expect(content).not.toContain("Fatima (Sadaf Tayyaba)");
    expect(content).toContain("shadowtalk@shadowtalk-ai.com");
    expect(content).toContain("Karachi, Pakistan");
  });

  it("App.tsx registers /fatima and alias routes", () => {
    const appSource = fs.readFileSync(appTsxPath, "utf-8");
    expect(appSource).toContain('path="/fatima"');
    expect(appSource).toContain('path="/co-founder"');
    expect(appSource).toContain('path="/sadaf-tayyaba"');
    expect(appSource).toContain("FatimaPage");
  });

  it("PAGE_SEO has complete metadata for fatima co-founder page", () => {
    const seo = (PAGE_SEO as Record<string, any>)["fatima"];
    expect(seo, "PAGE_SEO.fatima should exist").toBeDefined();
    expect(seo.title).toContain("Fatima");
    expect(seo.description).toContain("Co-Founder");
    expect(seo.canonical).toBe("https://www.shadowtalk-ai.com/fatima");
    expect(seo.keywords?.length).toBeGreaterThan(4);
  });

  it("Footer and CommandPalette link to /fatima", () => {
    const footerSource = fs.readFileSync(footerPath, "utf-8");
    expect(footerSource).toContain('href: "/fatima"');

    const cmdSource = fs.readFileSync(cmdPalettePath, "utf-8");
    expect(cmdSource).toContain('href: "/fatima"');
  });

  it("Enforces no image dependency for Fatima across FatimaPage, FounderPage, and seo", () => {
    const fatimaSource = fs.readFileSync(path.join(pagesDir, "FatimaPage.tsx"), "utf-8");
    expect(fatimaSource).not.toContain("<img");
    expect(fatimaSource).not.toContain("fatima-cofounder");

    const founderSource = fs.readFileSync(path.join(pagesDir, "FounderPage.tsx"), "utf-8");
    expect(founderSource).not.toContain("fatima-cofounder");

    const seoSource = fs.readFileSync(path.resolve(__dirname, "./seo.ts"), "utf-8");
    expect(seoSource).not.toContain("fatima-cofounder");
  });

  it("/about page features Fatima across spotlight, team, timeline, and canonical answers", () => {
    const aboutPageSource = fs.readFileSync(path.join(pagesDir, "AboutPage.tsx"), "utf-8");
    expect(aboutPageSource).toContain("AboutCoFounderSpotlight");
    expect(aboutPageSource).toContain("AboutTeam");

    const coFounderSpotlightSource = fs.readFileSync(
      path.resolve(__dirname, "../components/about/AboutCoFounderSpotlight.tsx"),
      "utf-8"
    );
    expect(coFounderSpotlightSource).toContain("Fatima");
    expect(coFounderSpotlightSource).not.toContain("Fatima (Sadaf Tayyaba)");
    expect(coFounderSpotlightSource).toContain("shadowtalk@shadowtalk-ai.com");
    expect(coFounderSpotlightSource).toContain("Second Developer");
    expect(coFounderSpotlightSource).not.toContain("<img");

    const teamSource = fs.readFileSync(path.resolve(__dirname, "../components/about/AboutTeam.tsx"), "utf-8");
    expect(teamSource).toContain('"Fatima"');
    expect(teamSource).not.toContain("Fatima (Sadaf Tayyaba)");
    expect(teamSource).toContain("shadowtalk@shadowtalk-ai.com");

    const timelineSource = fs.readFileSync(path.resolve(__dirname, "../components/about/AboutTimeline.tsx"), "utf-8");
    expect(timelineSource).toContain("Fatima Joins as Co-Founder");
  });

  it("Enforces business email shadowtalk@shadowtalk-ai.com and forbids personal emails", () => {
    const founderIdentitySource = fs.readFileSync(path.resolve(__dirname, "./founderIdentity.ts"), "utf-8");
    expect(founderIdentitySource).toContain("shadowtalk@shadowtalk-ai.com");
    expect(founderIdentitySource).not.toContain("shadowtalk68@gmail.com");

    const cofounderIdentitySource = fs.readFileSync(path.resolve(__dirname, "./cofounderIdentity.ts"), "utf-8");
    expect(cofounderIdentitySource).toContain("shadowtalk@shadowtalk-ai.com");
    expect(cofounderIdentitySource).not.toContain("sadaftayyaba655@gmail.com");
  });
});


