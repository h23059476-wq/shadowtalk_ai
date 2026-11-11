/** Known internal hrefs used across nav surfaces — validated in siteLinkAudit.test.ts */
export const CRITICAL_NAV_LINKS = [
  "/home",
  "/chatbot",
  "/settings",
  "/profile",
  "/about",
  "/founder",
  "/pricing",
  "/docs",
  "/blog",
  "/faq",
  "/contact",
] as const;

/** Legacy paths that must redirect via App.tsx (not 404) */
export const LEGACY_REDIRECT_PATHS = [
  "/zain-ahmed-biography",
  // Static marketing pages served as HTML by Firebase Hosting catch-all.
  "/anonymous-ai",
  "/ai-strategy-consultant",
  "/ai-business-planner",
  "/ai-translation-chat",
  "/ai-marketing-planner",
  "/best-ai-non-english",
  "/multilingual-ai",
  "/no-login-ai-chat",
  "/private-ai-no-training",
  "/free-ai-tools",
  "/discover",
  "/press",
  "/press-kit",
  "/press-release",
  "/facts",
  "/studio",
  "/young-ai-founder-pakistan",
  "/case-study-ai-strategy-psf",
  "/support/20-languages",
  "/google-seo",
  "/how-to-free-ai-chatbot-no-login",
  "/how-to-ai-strategy-planner-free",
  "/how-to-private-ai-chat",
  "/how-to-shadowtalk-vs-chatgpt-strategy",
] as const;

export function extractAppRoutePaths(appSource: string): string[] {
  const paths = new Set<string>();
  const re = /path="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(appSource)) !== null) {
    const p = m[1];
    if (!p.includes(":")) paths.add(p);
  }
  return [...paths];
}

/** Whether an internal href resolves to a defined route or legacy redirect */
export function isRoutableHref(href: string, appRoutePaths: readonly string[]): boolean {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean.startsWith("/")) return false;
  if (appRoutePaths.includes(clean)) return true;
  if (LEGACY_REDIRECT_PATHS.includes(clean as (typeof LEGACY_REDIRECT_PATHS)[number])) return true;
  return false;
}
