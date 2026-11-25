# Push notifications (Firebase Cloud Messaging)

ShadowTalk sends opt-in web push notifications to signed-in users — release
news, new model drops and downtime alerts. No marketing spam; one tap to
switch off; guests never see the prompt.

## Architecture

```
browser (signed-in user)
  └─ PushOptInBanner "Enable"
       └─ src/lib/pushNotifications.ts
            ├─ registers public/firebase-messaging-sw.js (SW = background push)
            ├─ Notification.requestPermission() → granted
            ├─ getToken(messaging, { vapidKey }) → FCM registration token
            └─ Firestore fcm_tokens doc (id = token, user_id = auth.uid, active: true)

ops machine (campaign sender)
  └─ scripts/fcm_campaign.py  (outside the repo; uses the Firebase service account)
       ├─ reads active tokens from Firestore fcm_tokens
       ├─ subscribes each token to topic "campaigns" (Instance ID API)
       └─ FCM HTTP v1 messages:send (branded webpush payload + link)
```

- **VAPID key**: subscriptions bind to the **project-managed web push
  certificate** (auto-provisioned by FCM; public key extracted from a real
  no-vapid subscription and pinned as a constant in `pushNotifications.ts`).
  FCM rejects registration with any other key pair (401 token-subscribe-failed),
  so the app must never ship a foreign key. Browsers holding stale/foreign
  subscriptions rotate transparently (`deleteToken` + unsubscribe + re-mint).
- **Firestore rules**: `fcm_tokens` docs are user-owned (`user_id ==
  auth.uid`); the campaign sender reads/writes them with server credentials
  that bypass rules.
- **Stale tokens self-heal**: sends that fail with `UNREGISTERED` / `410`
  mark the doc `active: false`, so later campaigns skip them.

## Foreground vs background

- A focused ShadowTalk tab shows the campaign as an **in-app toast**
  (`onMessage` in `pushNotifications.ts`, rendered by `PushOptInBanner`).
- With no focused tab, the service worker paints the **system notification**
  (`onBackgroundMessage` → `showNotification`, tag `shadowtalk-campaign`);
  clicking it focuses the app and navigates to the campaign link.

The SW must import the **same firebase compat version as the page bundle**
(currently 12.18.0) — the SW↔page forwarding protocol is version-sensitive.

## Sending a campaign

```bash
python3 scripts/fcm_campaign.py \
  --title "New in ShadowTalk: 3 fresh AI guides" \
  --body "Offline AI for travel, BYOK setup and account-free chat — this week's posts are live." \
  --url "https://www.shadowtalk-ai.com/blog" \
  --out /tmp/fcm-result.json
```

Useful flags: `--dry-run` (list recipients only), `--limit N`,
`--only-token T` (single-device test), `--subscribe-topic campaigns` (default;
empty string skips). The script exits non-zero if any send fails.

### Firebase console composer

The console's **Cloud Messaging → Notifications** composer works for our
users too, because every registered token is subscribed to topic
`campaigns` by the sender script (web SDKs cannot subscribe to topics from
the client):

1. Step 2 "Target" → **Topic** → enter `campaigns`.
2. Compose title/text; the branded icon is picked up by the service worker.
3. Review → Publish.

Console sends do not auto-subscribe new tokens — run any
`fcm_campaign.py` send (even `--dry-run`? no, a real send) once first, or
re-run the last campaign so fresh tokens join the topic.

## Troubleshooting

- **No token after opt-in**: check the destructive toast text in
  `PushOptInBanner` and the browser console `[push]` warnings. Permission
  must be granted (banner never shows for `denied`).
- **Message accepted by FCM but nothing displayed**: open the app on the
  origin and inspect the SW receipt log (IndexedDB):
  `indexedDB.open('shadowtalk-push-diag')` → store `events` records
  `push-event` / `background-message` / `notification-shown` /
  `show-error` / `init-error`. A missing `push-event` means delivery to the
  browser failed (stale token or dead push connection); a `show-error` means
  the SW saw the push but the OS rejected `showNotification`.
- **Legacy tokens**: tokens minted before the explicit-certificate switch keep
  working but are weaker; the banner rotates them to certificate-bound
  subscriptions on the next `Enable` tap.
