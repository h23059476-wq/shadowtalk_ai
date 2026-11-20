/**
 * ShadowTalk Analytics — Tracking API & Init
 *
 * `track()` is the single entry point. It enriches every event with the
 * anonymous identity, session, day bucket and current path, pushes it to the
 * offline queue and (best-effort) mirrors it to Firebase Analytics for the
 * Google-side funnel views. The Firestore write happens in BATCHES via
 * ingest.flushAnalyticsQueue() — never per-event, never on the critical path.
 *
 * Route tracking: mount <AnalyticsRouteTracker /> once inside <BrowserRouter>.
 * Every location change emits a `page_viewed` event.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/firebase";
import {
  getClientId,
  getOrCreateFirstTouch,
  ensureSession,
  touchSession,
} from "./identity";
import { enqueueEvent, flushAnalyticsQueue, installFlushTriggers } from "./ingest";

let initialized = false;
let lastTrackedPath: string | null = null;

export interface TrackParams {
  [key: string]: unknown;
  cta_name?: string;
  feature?: string;
  model?: string;
  path?: string;
  referrer?: string;
  utm_campaign?: string | null;
  is_new_client?: boolean;
}

/**
 * Emit one analytics event. Safe to call anywhere; never throws, never
 * blocks the UI thread (the network write is queued + batched).
 */
export function track(name: string, params: TrackParams = {}): void {
  try {
    const now = Date.now();
    const session = ensureSession(now);
    const clientId = getClientId();

    const event = {
      id: `evt-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      name,
      ts: now,
      day: localDay(now),
      path: typeof location !== "undefined" ? location.pathname : undefined,
      session_id: session.sessionId,
      client_id: clientId,
      params: sanitizeParams(params),
    };
    enqueueEvent(event);

    // Mirror to Firebase Analytics (Google-side funnels) — optional by design,
    // no-op when the measurement ID is missing or blocked by an ad blocker.
    try {
      trackEvent(name, { ...params, session_id: session.sessionId });
    } catch {
      /* analytics blocked — the first-party pipeline above still works */
    }

    // Fast-path flush for important funnel moments; everything else waits
    // for the interval/online/pagehide triggers.
    if (name === "chat_message_sent" || name === "session_started") {
      void flushAnalyticsQueue(now).catch(() => {});
    }
  } catch {
    /* analytics must NEVER break the app */
  }
}

function localDay(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Drop functions/undefined (un-serializable) and cap string sizes. */
function sanitizeParams(params: TrackParams): Record<string, unknown> | undefined {
  const clean: Record<string, unknown> = {};
  let hasAny = false;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || typeof value === "function") continue;
    if (typeof value === "string") clean[key] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean") clean[key] = value;
    else continue; // objects/arrays are not part of the analytics schema
    hasAny = true;
  }
  return hasAny ? clean : undefined;
}

/**
 * One-time init: opens/continues the session, emits `session_started` for
 * new visits (with first-touch attribution), and installs the flush
 * triggers (online / 20s interval / pagehide / visibility).
 */
export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const now = Date.now();
    const touch = getOrCreateFirstTouch(now);
    // getOrCreateFirstTouch stores firstSeen === now only when it CREATED the
    // touch (first visit); a stored touch always has an earlier firstSeen.
    const isNewClient = touch.firstSeen === now;
    const session = ensureSession(now);

    if (session.isNewVisit) {
      track("session_started", {
        referrer: touch.referrer,
        landing_path: touch.landingPath,
        utm_source: touch.utmSource,
        utm_medium: touch.utmMedium,
        utm_campaign: touch.utmCampaign,
        is_new_client: isNewClient,
      });
    } else {
      touchSession(now);
    }

    installFlushTriggers();
  } catch {
    /* analytics must NEVER break the app */
  }
}

/** Emit a page view for `path` (deduped against the previous path). */
export function trackPageView(path: string): void {
  if (lastTrackedPath === path) return;
  lastTrackedPath = path;
  track("page_viewed", { path });
}

/**
 * Mount ONCE inside <BrowserRouter>. Emits a page_viewed on every route
 * change and runs initAnalytics() on first mount.
 */
export function AnalyticsRouteTracker(): null {
  const location = useLocation();
  const didInit = useRef(false);

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      initAnalytics();
    }
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
