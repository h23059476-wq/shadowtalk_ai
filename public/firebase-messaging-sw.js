/* ShadowTalk AI — Firebase Cloud Messaging service worker (background push).
 *
 * The page-side SDK (src/lib/pushNotifications.ts) registers this file at the
 * origin root so FCM can deliver background notifications. Foreground messages
 * are handled in-page by onMessage() — this worker only paints the branded
 * system notification when no ShadowTalk tab is focused.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAOKVUWGIVihDXqAsY_Cl_XXeojTZ9xFNQ',
  authDomain: 'shadowtalk-ai-7a513.firebaseapp.com',
  projectId: 'shadowtalk-ai-7a513',
  messagingSenderId: '819076379544',
  appId: '1:819076379544:web:d164455df140a1255971ed',
});

const NOTIFICATION_ICON = '/pwa-192x192.png';

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const link = (payload.fcmOptions && payload.fcmOptions.link) || payload.data && payload.data.link || '/';
    self.registration.showNotification(notification.title || 'ShadowTalk AI', {
      body: notification.body || '',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      tag: 'shadowtalk-campaign',
      data: { link },
    });
  });
} catch (error) {
  // Push is unsupported in this browser — never break the service worker.
  console.warn('[ShadowTalk push] messaging init skipped:', error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  const target = new URL(link, self.location.origin).href;
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
