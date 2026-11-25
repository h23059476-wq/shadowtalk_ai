/**
 * FCM push notifications — client registration + foreground handling.
 *
 * Standard web-push path: getToken() is called with the project-managed
 * web push certificate public key (the FCM auto-provisioned certificate —
 * FCM rejects any foreign key pair), so the underlying PushSubscription uses
 * the RFC 8291 web-push protocol via the documented getToken API. Tokens
 * minted earlier without an explicit key, or against foreign keys, rotate
 * transparently: on a mismatch/401 we delete the stale token/subscription
 * and re-mint. A no-vapidKey fallback keeps registration working even if the
 * key constant is ever removed.
 *
 * Tokens are stored in Firestore `fcm_tokens` (rules: user-owned — the doc's
 * user_id must equal auth.uid). The campaign sender reads that collection with
 * server credentials and sends branded pushes via the FCM HTTP v1 API.
 */
import { isSupported, getMessaging, getToken, onMessage, deleteToken, type Messaging } from 'firebase/messaging';
import { backend } from '@/integrations/local/client';

const SW_PATH = '/firebase-messaging-sw.js';

/**
 * VAPID public key (applicationServerKey) for the standard web-push
 * subscription — this is the project-managed web push certificate that FCM
 * auto-provisioned (extracted from a real no-vapid subscription; FCM rejects
 * registration attempts that use any OTHER key pair with a 401
 * token-subscribe-failed). Passing it explicitly gives us the documented
 * getToken path AND keeps FCM + console sends working. The corresponding
 * private half is Google-held; direct RFC 8291 sends can use the ops vault
 * key pair (~/.vapid-keys.json) against a custom-key subscription if ever
 * needed.
 */
const VAPID_PUBLIC_KEY = 'BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4';

export interface PushRegistrationResult {
  ok: boolean;
  token?: string;
  error?: string;
}

async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    if (!(await isSupported())) return null;
    return getMessaging();
  } catch {
    return null;
  }
}

/** Register the FCM service worker (idempotent). */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_PATH);
  } catch (error) {
    console.warn('[push] service worker registration failed:', error);
    return null;
  }
}

/** Current browser notification permission: 'default' | 'granted' | 'denied'. */
export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Ask for permission, mint/refresh the FCM token and store it in Firestore.
 * Safe to call repeatedly — the token is upserted on conflict.
 */
export async function enablePushNotifications(userId: string): Promise<PushRegistrationResult> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    return { ok: false, error: 'Push notifications are not supported in this browser.' };
  }
  const registration = await registerPushServiceWorker();
  if (!registration) {
    return { ok: false, error: 'Could not register the notification service worker.' };
  }
  // Wait for the worker to activate — subscribing too early throws.
  if (!registration.active) {
    await new Promise<void>((resolve) => {
      const worker = registration.installing || registration.waiting;
      if (registration.active || !worker) return resolve();
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
      });
      setTimeout(resolve, 4000);
    });
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    permission = Notification.permission;
  }
  if (permission !== 'granted') {
    return { ok: false, error: 'Notification permission was not granted.' };
  }

  let token: string;
  try {
    // Standard path — subscribe the browser's PushSubscription to our VAPID key.
    token = await getToken(messaging, { serviceWorkerRegistration: registration, vapidKey: VAPID_PUBLIC_KEY });
  } catch (error: any) {
    const message = String(error?.message || error || '');
    // A token/subscription minted with a different (or no longer accepted)
    // key is still registered in this browser — rotate it: drop the stale
    // artifact, re-mint. Covers applicationServerKey mismatches AND FCM 401s
    // (token-subscribe-failed) against subscriptions bound to foreign keys.
    if (/applicationServerKey|subscription|vapid|mismatch|unsubscrib|token-subscribe-failed|authentication credential/i.test(message)) {
      try { await deleteToken(messaging); } catch { /* already gone */ }
      try {
        const stale = await registration.pushManager.getSubscription();
        if (stale) await stale.unsubscribe();
      } catch { /* nothing to drop */ }
      try {
        token = await getToken(messaging, { serviceWorkerRegistration: registration, vapidKey: VAPID_PUBLIC_KEY });
      } catch (retryError: any) {
        // Last resort: FCM's project-managed certificate (legacy, deprecated).
        try {
          token = await getToken(messaging, { serviceWorkerRegistration: registration });
        } catch {
          return { ok: false, error: retryError?.message || 'Could not obtain a push token.' };
        }
      }
    } else {
      return { ok: false, error: error?.message || 'Could not obtain a push token.' };
    }
  }
  if (!token) {
    return { ok: false, error: 'Push token was empty — try again in a moment.' };
  }

  // Doc ID = the FCM token itself (setDoc-merge fast path — NO pre-write
  // query, which security rules would deny: a query on `token` can't prove
  // ownership). create/update ownership is enforced by user_id == auth.uid.
  const { error } = await backend
    .from('fcm_tokens')
    .upsert({
      id: token,
      token,
      user_id: userId,
      platform: 'web',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : '',
      topic: 'campaigns',
      active: true,
    }, { onConflict: 'id' });
  if (error) {
    console.warn('[push] token save failed:', error);
    return { ok: false, error: 'Could not save the notification subscription.' };
  }
  return { ok: true, token };
}

/** Stop push: revoke the FCM token, deactivate the Firestore row. */
export async function disablePushNotifications(userId: string): Promise<void> {
  const messaging = await getMessagingIfSupported();
  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch {
      /* token already gone */
    }
  }
  try {
    const { data } = await backend
      .from('fcm_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true);
    for (const row of data || []) {
      await backend.from('fcm_tokens').update({ active: false }).eq('id', row.id);
    }
  } catch (error) {
    console.warn('[push] token deactivation failed:', error);
  }
}

/**
 * Foreground messages (a ShadowTalk tab is focused): dispatch a window event
 * so any listener (banner, toast host) can surface the campaign in-app.
 */
export function listenForegroundPush(handler: (payload: { title: string; body: string; link?: string }) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  void (async () => {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return;
    unsubscribe = onMessage(messaging, (payload) => {
      handler({
        title: payload.notification?.title || 'ShadowTalk AI',
        body: payload.notification?.body || '',
        link: payload.fcmOptions?.link || (payload.data?.link as string | undefined) || '/',
      });
    });
  })();
  return () => {
    if (unsubscribe) unsubscribe();
  };
}
