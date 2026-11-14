import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  CRITICAL_NAV_LINKS,
  extractAppRoutePaths,
  extractDynamicRoutePatterns,
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
  const dynamicPatterns = extractDynamicRoutePatterns(appSource);

  /**
   * Routes rendered with real page components (not <Navigate> redirects, not
   * the "*" catch-all, and not the /auth/action email-link transactional
   * handler). Every one of these must be reachable from the CommandPalette.
   */
  const PALETTE_ROUTE_EXCEPTIONS = new Set(["/auth/action"]);
  const renderedStaticRoutes = appSource
    .split("\n")
    .filter((line) => line.includes('path="') && line.includes("element="))
    .filter((line) => !line.includes("<Navigate"))
    .map((line) => line.match(/path="([^"]+)"/)?.[1])
    .filter((p): p is string => Boolean(p))
    .filter((p) => p !== "*" && !p.includes(":") && !PALETTE_ROUTE_EXCEPTIONS.has(p));

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

  it("every CommandPalette href resolves to a real route", () => {
    const palette = readSrc("components/CommandPalette.tsx");
    const paletteHrefs = [...palette.matchAll(/href:\s*"(\/[^"]+)"/g)].map((m) => m[1]);
    expect(paletteHrefs.length, "palette must not be empty").toBeGreaterThan(0);
    const broken = paletteHrefs.filter((href) => !isRoutableHref(href, appRoutes, dynamicPatterns));
    expect(broken, `palette links to non-existent routes: ${broken.join(", ")}`).toEqual([]);
  });

  it("CommandPalette covers every rendered page route in App.tsx", () => {
    const palette = readSrc("components/CommandPalette.tsx");
    const paletteHrefs = new Set(
      [...palette.matchAll(/href:\s*"(\/[^"]+)"/g)].map((m) => m[1]),
    );
    const missing = renderedStaticRoutes.filter((route) => !paletteHrefs.has(route));
    expect(
      missing,
      `real pages missing from CommandPalette: ${missing.join(", ")}`,
    ).toEqual([]);
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
        if (!isRoutableHref(href, appRoutes, dynamicPatterns)) {
          broken.push(href);
        }
      }
    }
    expect(broken, `broken hrefs: ${broken.join(", ")}`).toEqual([]);
  });
});
