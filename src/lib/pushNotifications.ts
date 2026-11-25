/**
 * FCM push notifications — client registration + foreground handling.
 *
 * Zero-config token path: getToken() is called WITHOUT a vapidKey, which uses
 * FCM's project-managed web push certificate (no Firebase-console step). If a
 * certificate is ever created in Console → Project settings → Cloud Messaging,
 * pass its public key as getToken({ vapidKey }) for smoother re-subscribes;
 * tokens minted without one keep working.
 *
 * Tokens are stored in Firestore `fcm_tokens` (rules: user-owned — the doc's
 * user_id must equal auth.uid). The campaign sender reads that collection with
 * server credentials and sends branded pushes via the FCM HTTP v1 API.
 */
import { isSupported, getMessaging, getToken, onMessage, deleteToken, type Messaging } from 'firebase/messaging';
import { backend } from '@/integrations/local/client';

const SW_PATH = '/firebase-messaging-sw.js';

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
    // No vapidKey → FCM project-managed certificate (no console setup needed).
    token = await getToken(messaging, { serviceWorkerRegistration: registration });
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Could not obtain a push token.' };
  }
  if (!token) {
    return { ok: false, error: 'Push token was empty — try again in a moment.' };
  }

  const { error } = await backend
    .from('fcm_tokens')
    .upsert({
      token,
      user_id: userId,
      platform: 'web',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : '',
      topic: 'campaigns',
      active: true,
    }, { onConflict: 'token' });
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
