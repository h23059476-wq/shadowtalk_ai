/* ShadowTalk AI — Firebase Cloud Messaging service worker (background push).
 *
 * The page-side SDK (src/lib/pushNotifications.ts) registers this file at the
 * origin root so FCM can deliver background notifications. Foreground messages
 * are handled in-page by onMessage() — this worker only paints the branded
 * system notification when no ShadowTalk tab is focused.
 *
 * NOTE: the compat SDK version MUST match the page-side firebase npm version
 * (firebase ^12.18.0) — the SW↔page message-forwarding protocol is internal
 * and version-sensitive.
 */
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAOKVUWGIVihDXqAsY_Cl_XXeojTZ9xFNQ',
  authDomain: 'shadowtalk-ai-7a513.firebaseapp.com',
  projectId: 'shadowtalk-ai-7a513',
  messagingSenderId: '819076379544',
  appId: '1:819076379544:web:d164455df140a1255971ed',
});

const NOTIFICATION_ICON = '/pwa-192x192.png';

/* Delivery diagnostics — a tiny IndexedDB receipt log readable from any page
 * on this origin (indexedDB open with the same name). Lets us answer "did the
 * push event actually reach the service worker?" when a user reports a
 * missing notification. Diagnostics must never break push delivery. */
const DIAG_DB = 'shadowtalk-push-diag';
async function recordDiag(kind, detail) {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DIAG_DB, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore('events', { autoIncrement: true });
        store.createIndex('kind', 'kind', { unique: false });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      tx.objectStore('events').add({ kind, detail: String(detail || '').slice(0, 300), at: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    console.warn('[ShadowTalk push SW] diag write failed:', error);
  }
}

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const link = (payload.fcmOptions && payload.fcmOptions.link) || payload.data && payload.data.link || '/';
    recordDiag('background-message', notification.title || '(no title)');
    self.registration.showNotification(notification.title || 'ShadowTalk AI', {
      body: notification.body || '',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: 'shadowtalk-campaign',
      data: { link },
    })
      .then(() => recordDiag('notification-shown', notification.title || '(no title)'))
      .catch((error) => recordDiag('show-error', String(error && error.message || error)));
  });
} catch (error) {
  // Push is unsupported in this browser — never break the service worker.
  console.warn('[ShadowTalk push] messaging init skipped:', error);
  recordDiag('init-error', String(error && error.message || error));
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  const target = new URL(link, self.location.origin).href;
  recordDiag('notification-click', target);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          client.navigate(target).catch(() => client.focus());
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

// Delivery diagnostics: confirms whether FCM pushes actually reach this
// service worker (campaigns pipeline debugging aid — harmless in production).
self.addEventListener('push', (event) => {
  const bytes = event.data ? event.data.text().length : 0;
  console.log('[ShadowTalk push SW] push event received, data bytes:', bytes);
  event.waitUntil(recordDiag('push-event', `${bytes} bytes`));
});
