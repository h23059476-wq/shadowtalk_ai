/**
 * Cloudflare Web Analytics — optional, token-gated marketing beacon.
 *
 * Cloudflare Web Analytics is cookieless, does not fingerprint, and does not
 * track users across sites — the only third-party measurement tool that fits
 * ShadowTalk's privacy stance. It is also strictly OPTIONAL:
 *
 * - Set VITE_CF_BEACON_TOKEN at build time (Cloudflare dashboard →
 *   Web Analytics → copy the JS beacon token) and this component injects
 *   the beacon script.
 * - Leave it unset and NOTHING loads — zero third-party requests, the
 *   first-party pipeline in src/lib/analytics/ remains the only collector.
 *
 * The token is read at BUILD time via import.meta.env so the beacon is not
 * even referenced in the shipped HTML when unset (verified in the PWA
 * offline story: no network call, nothing to block).
 */

import { useEffect } from "react";

const TOKEN = import.meta.env.VITE_CF_BEACON_TOKEN as string | undefined;

declare global {
  interface Window {
    _cf_beacon?: { token: string };
  }
}

export function CloudflareWebAnalyticsBeacon() {
  useEffect(() => {
    if (!TOKEN) return undefined;
    if (document.querySelector("script[data-cf-beacon-token]")) return undefined;

    window._cf_beacon = { token: TOKEN };
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.setAttribute("data-cf-beacon-token", "true");
    document.head.appendChild(script);
    return () => {
      script.remove();
      delete window._cf_beacon;
    };
  }, []);

  return null;
}

export default CloudflareWebAnalyticsBeacon;
