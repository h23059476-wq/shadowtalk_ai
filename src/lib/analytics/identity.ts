/**
 * ShadowTalk Analytics — Anonymous Identity, Session & Attribution Layer
 *
 * Privacy guarantees (these are the product's brand, not just policy):
 * - The client ID is a random UUID generated on the device and stored in
 *   localStorage. It is NOT a fingerprint, NOT derived from IP/UA, and is
 *   resettable by the user at any time (`resetAnalyticsIdentity`).
 * - No PII is ever captured: no emails, no names, no account IDs. Signed-in
 *   users are tracked by the same anonymous ID as signed-out ones.
 * - Attribution stores only referrer HOST and UTM string params — no full
 *   URLs, no query payloads beyond utm_*.
 * - Everything works offline: identity lives in localStorage, not in the
 *   network. Events queue locally and sync when connectivity returns
 *   (see ingest.ts) — analytics that work in airplane mode, like the app.
 *
 * Storage keys are versioned so a schema change never corrupts old data.
 */

const CLIENT_ID_KEY = "st_analytics_client_id_v1";
const SESSION_KEY = "st_analytics_session_v1";
const FIRST_TOUCH_KEY = "st_analytics_first_touch_v1";
const RETURN_FLAGS_KEY = "st_analytics_return_flags_v1";

/** 30 minutes of inactivity closes a session (industry standard). */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Storage abstraction — injectable so tests can run against a plain Map
// without jsdom/localStorage quirks.
// ---------------------------------------------------------------------------

export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function localStorageStore(): KVStore | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    // Accessing localStorage can throw in privacy modes (Safari private).
    window.localStorage.getItem("__st_probe__");
    window.localStorage.removeItem("__st_probe__");
    return window.localStorage;
  } catch {
    return null;
  }
}

function sessionStorageStore(): KVStore | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    window.sessionStorage.getItem("__st_probe__");
    window.sessionStorage.removeItem("__st_probe__");
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let injectedLocal: KVStore | null = null;
let injectedSession: KVStore | null = null;

/** @internal test hook — inject in-memory stores instead of window storage */
export function __injectStoresForTests(local: KVStore | null, session: KVStore | null) {
  injectedLocal = local;
  injectedSession = session;
}

function local(): KVStore | null {
  return injectedLocal ?? localStorageStore();
}

function sessionStore(): KVStore | null {
  return injectedSession ?? sessionStorageStore();
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Non-crypto fallback for very old browsers — still random, still anonymous.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Client ID — random, durable, resettable
// ---------------------------------------------------------------------------

/** Stable anonymous ID for this browser. Generated on first use. */
export function getClientId(): string {
  const store = local();
  if (!store) return `ephemeral-${uuid()}`; // privacy mode: identity lives for the tab only
  try {
    const existing = store.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = uuid();
    store.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return `ephemeral-${uuid()}`;
  }
}

/**
 * Privacy self-service: wipes the analytics identity, first-touch
 * attribution and return flags. Sessions (sessionStorage) die with the tab.
 */
export function resetAnalyticsIdentity(): void {
  const store = local();
  if (!store) return;
  try {
    store.removeItem(CLIENT_ID_KEY);
    store.removeItem(FIRST_TOUCH_KEY);
    store.removeItem(RETURN_FLAGS_KEY);
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Sessions — 30-minute inactivity window, one "visit" per session start
// ---------------------------------------------------------------------------

interface SessionRecord {
  id: string;
  startedAt: number;
  lastActiveAt: number;
}

export interface SessionInfo {
  sessionId: string;
  /** true when this call (re)opened a session — counts as one visit */
  isNewVisit: boolean;
}

/**
 * Returns the active session, opening a new one when:
 * - no session exists yet (fresh tab), or
 * - the last activity is older than SESSION_TIMEOUT_MS.
 */
export function ensureSession(now: number = Date.now()): SessionInfo {
  const store = sessionStore();
  if (!store) {
    // No sessionStorage: every call is its own mini-session.
    return { sessionId: `s-${uuid()}`, isNewVisit: true };
  }
  try {
    const raw = store.getItem(SESSION_KEY);
    if (raw) {
      const rec = JSON.parse(raw) as SessionRecord;
      if (now - rec.lastActiveAt < SESSION_TIMEOUT_MS) {
        store.setItem(SESSION_KEY, JSON.stringify({ ...rec, lastActiveAt: now }));
        return { sessionId: rec.id, isNewVisit: false };
      }
    }
    const fresh: SessionRecord = { id: uuid(), startedAt: now, lastActiveAt: now };
    store.setItem(SESSION_KEY, JSON.stringify(fresh));
    return { sessionId: fresh.id, isNewVisit: true };
  } catch {
    return { sessionId: `s-${uuid()}`, isNewVisit: true };
  }
}

/** Touch the session's last-active timestamp without opening new sessions. */
export function touchSession(now: number = Date.now()): void {
  const store = sessionStore();
  if (!store) return;
  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return;
    const rec = JSON.parse(raw) as SessionRecord;
    store.setItem(SESSION_KEY, JSON.stringify({ ...rec, lastActiveAt: now }));
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// First-touch attribution — referrer host + utm_*, captured once
// ---------------------------------------------------------------------------

export interface FirstTouch {
  /** epoch ms of the very first visit we observed */
  firstSeen: number;
  /** pathname of the first page in this browser (e.g. "/home") */
  landingPath: string;
  /** document.referrer HOST only, "direct" when none */
  referrer: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

function referrerHost(): string {
  if (typeof document === "undefined") return "direct";
  try {
    const ref = document.referrer;
    if (!ref) return "direct";
    const host = new URL(ref).hostname;
    if (!host) return "direct";
    if (typeof location !== "undefined" && host === location.hostname) return "internal";
    return host;
  } catch {
    return "direct";
  }
}

function utmFrom(search: string): Pick<FirstTouch, "utmSource" | "utmMedium" | "utmCampaign" | "utmTerm" | "utmContent"> {
  const parse = (key: string): string | null => {
    if (typeof URLSearchParams === "undefined") return null;
    const v = new URLSearchParams(search).get(key);
    const clean = v ? v.slice(0, 120) : null;
    return clean && clean.length > 0 ? clean : null;
  };
  return {
    utmSource: parse("utm_source"),
    utmMedium: parse("utm_medium"),
    utmCampaign: parse("utm_campaign"),
    utmTerm: parse("utm_term"),
    utmContent: parse("utm_content"),
  };
}

/**
 * Captures first-touch attribution ONCE per browser (first write wins —
 * that is the correct marketing semantics for first-touch models).
 */
export function getOrCreateFirstTouch(now: number = Date.now()): FirstTouch {
  const store = local();
  const existing = store?.getItem(FIRST_TOUCH_KEY);
  if (existing) {
    try {
      return JSON.parse(existing) as FirstTouch;
    } catch {
      /* fall through and re-capture */
    }
  }
  const search = typeof location !== "undefined" ? location.search : "";
  const landingPath = typeof location !== "undefined" ? location.pathname : "/";
  const touch: FirstTouch = {
    firstSeen: now,
    landingPath: landingPath.slice(0, 200),
    referrer: referrerHost(),
    ...utmFrom(search),
  };
  try {
    store?.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
  } catch {
    /* noop */
  }
  return touch;
}

// ---------------------------------------------------------------------------
// Return flags — D1 / D7 / D30 retention bookkeeping on the client record
// ---------------------------------------------------------------------------

export interface ReturnFlags {
  returned_d1?: boolean;
  returned_d7?: boolean;
  returned_d30?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
/** Grace window so "day 7" means day 7±6h of wall clock, not to the millisecond. */
const FLAG_WINDOW_MS = 6 * 60 * 60 * 1000;

function dayIndexBetween(firstSeen: number, now: number, day: number): boolean {
  const start = firstSeen + day * DAY - FLAG_WINDOW_MS;
  const end = firstSeen + day * DAY + FLAG_WINDOW_MS;
  return now >= start && now <= end;
}

/**
 * Updates the sticky return flags stored on this device. A flag flips true
 * when the browser is seen again around the Nth day after first touch.
 * Pure function over (storedFlags, firstSeen, now) so it is unit-testable.
 */
export function computeReturnFlags(stored: ReturnFlags, firstSeen: number, now: number): ReturnFlags {
  const next: ReturnFlags = { ...stored };
  if (!next.returned_d1 && dayIndexBetween(firstSeen, now, 1)) next.returned_d1 = true;
  if (!next.returned_d7 && dayIndexBetween(firstSeen, now, 7)) next.returned_d7 = true;
  if (!next.returned_d30 && dayIndexBetween(firstSeen, now, 30)) next.returned_d30 = true;
  return next;
}

export function updateReturnFlags(firstSeen: number, now: number = Date.now()): ReturnFlags {
  const store = local();
  let stored: ReturnFlags = {};
  const raw = store?.getItem(RETURN_FLAGS_KEY);
  if (raw) {
    try {
      stored = JSON.parse(raw) as ReturnFlags;
    } catch {
      stored = {};
    }
  }
  const next = computeReturnFlags(stored, firstSeen, now);
  try {
    store?.setItem(RETURN_FLAGS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}

/** Local date (YYYY-MM-DD) used as the daily aggregation bucket key. */
export function localDayKey(now: number = Date.now()): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
