import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const componentsDir = path.resolve(__dirname, "../components");
const landingNavPath = path.join(componentsDir, "landing/LandingNavigation.tsx");
const landingHubPath = path.join(componentsDir, "landing/LandingSectionHub.tsx");
const founderSpotlightPath = path.join(componentsDir, "founder/FounderSpotlightSection.tsx");
const contactSectionPath = path.join(componentsDir, "landing/LandingContactSection.tsx");
const indexPath = path.resolve(__dirname, "../pages/Index.tsx");

describe("Landing Page Modularization & 3-Bar Navigation Verification", () => {
  it("LandingNavigation includes 3-bar hamburger menu button and full drawer", () => {
    expect(fs.existsSync(landingNavPath), "LandingNavigation.tsx should exist").toBe(true);
    const content = fs.readFileSync(landingNavPath, "utf-8");

    // Hamburger button & drawer states
    expect(content).toContain("drawerOpen");
    expect(content).toContain("setDrawerOpen");
    expect(content).toContain("aria-label=\"Open navigation menu");

    // All 4 required categories in navigation hub
    expect(content).toContain("Services & AI Tools");
    expect(content).toContain("About Us / Founders");
    expect(content).toContain("Pricing & Access");
    expect(content).toContain("Contact Details & Support");

    // Founder and Co-founder links in drawer
    expect(content).toContain('to="/founder"');
    expect(content).toContain('to="/fatima"');
    expect(content).toContain("Zain Ahmed");
    expect(content).toContain("Fatima");

    // Official email
    expect(content).toContain("shadowtalk@shadowtalk-ai.com");
    expect(content).not.toContain("sadaftayyaba655@gmail.com");
    expect(content).not.toContain("shadowtalk68@gmail.com");
  });

  it("LandingSectionHub exists and provides interactive tabs for all 4 sections", () => {
    expect(fs.existsSync(landingHubPath), "LandingSectionHub.tsx should exist").toBe(true);
    const content = fs.readFileSync(landingHubPath, "utf-8");

    expect(content).toContain('"services"');
    expect(content).toContain('"founders"');
    expect(content).toContain('"pricing"');
    expect(content).toContain('"contact"');
    expect(content).toContain("Zain Ahmed");
    expect(content).toContain("Fatima");
    expect(content).toContain("shadowtalk@shadowtalk-ai.com");
  });

  it("FounderSpotlightSection features both Zain Ahmed and Fatima with zero image dependency", () => {
    expect(fs.existsSync(founderSpotlightPath), "FounderSpotlightSection.tsx should exist").toBe(true);
    const content = fs.readFileSync(founderSpotlightPath, "utf-8");

    expect(content).toContain("FOUNDER_CANONICAL.fullName");
    expect(content).toContain("COFOUNDER_CANONICAL.fullName");
    expect(content).toContain("Zain Ahmed");
    expect(content).toContain("Fatima");
    expect(content).not.toContain("Fatima (Sadaf Tayyaba)");
    expect(content).not.toContain("<img");
    expect(content).toContain("shadowtalk@shadowtalk-ai.com");
  });

  it("LandingContactSection provides direct email and support channels", () => {
    expect(fs.existsSync(contactSectionPath), "LandingContactSection.tsx should exist").toBe(true);
    const content = fs.readFileSync(contactSectionPath, "utf-8");

    expect(content).toContain("shadowtalk@shadowtalk-ai.com");
    expect(content).toContain('to="/contact"');
    expect(content).toContain('to="/status"');
    expect(content).toContain('to="/faq"');
  });

  it("Index.tsx integrates LandingSectionHub and defines anchored modular sections", () => {
    expect(fs.existsSync(indexPath), "Index.tsx should exist").toBe(true);
    const content = fs.readFileSync(indexPath, "utf-8");

    expect(content).toContain("LandingNavigation");
    expect(content).toContain("LandingSectionHub");
    expect(content).toContain('id="services"');
    expect(content).toContain('id="founders"');
    expect(content).toContain('id="pricing"');
    expect(content).toContain('id="contact"');
    expect(content).toContain("FounderSpotlightSection");
  });
});
