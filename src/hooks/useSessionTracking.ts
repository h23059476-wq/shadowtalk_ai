import { useEffect, useRef } from "react";
import { backend } from "@/integrations/local/client";
import { useAuth } from "@/components/AuthProvider";

import { markExplicitSignOut } from "@/lib/persistentAuth";
import { clearUserLocalData } from "@/lib/signOutCleanup";

const SESSION_TOKEN_KEY = "shadowtalk_session_token";
const HEARTBEAT_MS = 60_000;

function genToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getOrCreateSessionToken(): string {
  let t = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!t) {
    t = genToken();
    localStorage.setItem(SESSION_TOKEN_KEY, t);
  }
  return t;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return `${browser} on ${os}`;
}

async function ipHash(): Promise<string> {
  // Lightweight client fingerprint (not real IP, hashed)
  const fp = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${new Date().getTimezoneOffset()}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fp));
  return Array.from(new Uint8Array(buf).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Tracks each authenticated device as a row in user_sessions.
 * Heartbeats last_seen_at every minute. Marks current session.
 */
export function useSessionTracking() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user) {
      registered.current = false;
      return;
    }
    if (registered.current) return;
    registered.current = true;

    const token = getOrCreateSessionToken();
    let cancelled = false;

    (async () => {
      try {
        const ip_hash = await ipHash();
        // Mark all other sessions as not current, then upsert this one as current
        await backend
          .from("user_sessions")
          .update({ is_current: false })
          .eq("user_id", user.id)
          .neq("session_token", token);

        const { data: existing } = await backend
          .from("user_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("session_token", token)
          .maybeSingle();

        if (existing) {
          await backend
            .from("user_sessions")
            .update({
              is_current: true,
              last_seen_at: new Date().toISOString(),
              revoked_at: null,
              device_label: deviceLabel(),
              user_agent: navigator.userAgent,
              ip_hash,
            })
            .eq("user_id", user.id)
            .eq("session_token", token);
        } else {
          await backend.from("user_sessions").insert({
            user_id: user.id,
            session_token: token,
            device_label: deviceLabel(),
            user_agent: navigator.userAgent,
            ip_hash,
            is_current: true,
          });
        }
      } catch (e) {
        console.warn("[SessionTracking] register failed", e);
      }
    })();

    const heartbeat = setInterval(async () => {
      if (cancelled) return;

      try {
        const { data } = await backend
          .from("user_sessions")
          .select("revoked_at")
          .eq("user_id", user.id)
          .eq("session_token", token)
          .maybeSingle();

        if (data?.revoked_at) {
          // Final completion phase — keep cleanup consistent with interactive
          // sign-out: ephemeral user-scoped state (E2EE session keys,
          // private-mode flags) must not outlive the revoked identity.
          try { clearUserLocalData(user.id); } catch { /* best effort */ }
          markExplicitSignOut();
          await backend.auth.signOut();
          localStorage.removeItem(SESSION_TOKEN_KEY);
          window.location.href = "/auth";
          return;
        }

        await backend
          .from("user_sessions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("session_token", token);
      } catch {
        // ignore transient errors
      }
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
    };
  }, [user]);
}
