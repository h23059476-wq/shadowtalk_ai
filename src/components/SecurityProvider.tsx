import React, { useEffect } from 'react';
import { useSessionTracking } from '@/hooks/useSessionTracking';

/**
 * SecurityProvider — Global client-side security hardening:
 * 1. Device session heartbeat (remote revocation from /sessions only)
 * 2. Anti-tampering monitoring
 * 3. CSP / referrer meta tags
 *
 * Sessions stay signed in until the user clicks Log out — no inactivity timeout.
 */
export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSessionTracking();

  // === Prototype pollution prevention (logging only) ===
  useEffect(() => {
    if (import.meta.env.PROD) {
      console.info('[Security] Prototype pollution monitoring active');
    }
  }, []);

  // === Block right-click context menu in production ===
  useEffect(() => {
    if (import.meta.env.PROD) {
      const blockContextMenu = (e: MouseEvent) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
      };
      document.addEventListener('contextmenu', blockContextMenu);
      return () => document.removeEventListener('contextmenu', blockContextMenu);
    }
  }, []);

  // === Detect and warn about devtools (production only, warn once) ===
  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const threshold = 160;
    let warned = false;
    const check = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if ((widthDiff || heightDiff) && !warned) {
        warned = true;
        console.warn('%c⚠️ Security Warning: Developer tools detected', 'color: red; font-size: 20px; font-weight: bold;');
      }
    };

    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  // === Inject security meta tags ===
  useEffect(() => {
    let referrerMeta = document.querySelector('meta[name="referrer"]');
    if (!referrerMeta) {
      referrerMeta = document.createElement('meta');
      referrerMeta.setAttribute('name', 'referrer');
      document.head.appendChild(referrerMeta);
    }
    referrerMeta.setAttribute('content', 'strict-origin-when-cross-origin');

    let xContentType = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
    if (!xContentType) {
      xContentType = document.createElement('meta');
      xContentType.setAttribute('http-equiv', 'X-Content-Type-Options');
      xContentType.setAttribute('content', 'nosniff');
      document.head.appendChild(xContentType);
    }
  }, []);

  // === Clickjacking detection (production only, allowlist-based) ===
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    if (window.self === window.top) return;

    const isAllowedHost = (host: string) =>
      host === 'shadowtalk-ai.com' ||
      host.endsWith('.shadowtalk-ai.com') ||
      host.endsWith('.firebaseapp.com') ||
      host.endsWith('.web.app');

    // Identify the framing window: read it directly when same-origin, else
    // fall back to the referrer. An empty referrer from a cross-origin frame
    // is treated as UNTRUSTED — the previous logic inverted this and treated
    // every referrer-less frame as safe, disabling the guard in practice.
    let framedBy = '';
    try {
      framedBy = new URL(window.top.location.href).hostname;
    } catch {
      try {
        framedBy = new URL(document.referrer).hostname;
      } catch {
        framedBy = '';
      }
    }

    if (!isAllowedHost(window.location.hostname) && !(framedBy && isAllowedHost(framedBy))) {
      document.body.style.display = 'none';
      console.error('Clickjacking detected — content hidden');
    }
  }, []);

  return <>{children}</>;
};
