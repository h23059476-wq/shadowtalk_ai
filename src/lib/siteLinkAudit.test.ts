import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  CRITICAL_NAV_LINKS,
  extractAppRoutePaths,
  isRoutableHref,
} from "./siteLinkAudit";

const root = resolve(__dirname, "../..");

function readSrc(relative: string): string {
  return readFileSync(resolve(root, "src", relative), "utf-8");
}

function extractInternalHrefs(source: string): string[] {
  const hrefs = new Set<string>();
  const patterns = [
    /href:\s*"(\/[^"]+)"/g,
    /href="(\/[^"]+)"/g,
    /to="(\/[^"]+)"/g,
    /navigate\("(\/[^"]+)"\)/g,
    /navigate\(`(\/[^`?]+)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      hrefs.add(m[1]);
    }
  }
  return [...hrefs];
}

describe("site link audit", () => {
  const appSource = readSrc("App.tsx");
  const appRoutes = extractAppRoutePaths(appSource);

  it("App.tsx defines all critical nav routes", () => {
    for (const path of CRITICAL_NAV_LINKS) {
      expect(
        appRoutes.includes(path),
        `missing route: ${path}`,
      ).toBe(true);
    }
  });

  // Note: The missioncontrol and AdNetwork tests were removed because those
  // pages/components were removed in the v3.0.0 architecture pivot.
  // /missioncontrol is now a prerendered marketing page, not an app route.

  it("Voice home alias routes to marketing /home", () => {
    const voice = readSrc("components/VoiceCommandSystem.tsx");
    expect(voice).toMatch(/path:\s*"\/home"[^]*names:.*"home"/s);
    expect(voice).toContain('path: "/settings"');
  });

  it("global CommandPalette includes Settings", () => {
    const palette = readSrc("components/CommandPalette.tsx");
    expect(palette).toContain('href: "/settings"');
  });

  it("Navigation includes Settings", () => {
    const nav = readSrc("components/Navigation.tsx");
    expect(nav).toContain('href: "/settings"');
  });

  it("chat sidebar active matcher handles query strings", () => {
    const sidebar = readSrc("components/chat/ChatSidebarNavList.tsx");
    expect(sidebar).toContain("location.search");
  });

  it("Footer and Navigation hrefs resolve to App routes", () => {
    const sources = [
      readSrc("components/Footer.tsx"),
      readSrc("components/Navigation.tsx"),
      readSrc("lib/landingNav.ts"),
      readSrc("lib/chatSidebarNav.ts"),
    ];
    const broken: string[] = [];
    for (const src of sources) {
      for (const href of extractInternalHrefs(src)) {
        if (!isRoutableHref(href, appRoutes)) {
          broken.push(href);
        }
      }
    }
    expect(broken, `broken hrefs: ${broken.join(", ")}`).toEqual([]);
  });
});
