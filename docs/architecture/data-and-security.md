# Data and security boundaries

## Identity and authorization

Firebase Authentication supplies the signed-in identity. The Firebase adapter attaches an ID token to HTTPS Function calls when a user is signed in. Each Function must still validate the token and authorize its operation; Functions using Firebase Admin bypass Firestore client rules.

`firestore.rules` defines public reads, authenticated/user-owned data, admin paths, and an explicit whitelist for private user-data collections. User writes are checked against ownership fields such as `user_id`. Realtime channel and room-presence reads are available to signed-in users as a broadcast model, while writes require ownership. `storage.rules` allows public reads for designated asset buckets and scopes other user files to the matching UID. Review rules alongside query/write code when changing a feature.

## Firestore data categories

Collection names used across the app include:

- Account/configuration: `profiles`, `user_roles`, `user_settings`, `subscribers`, `manual_payments`.
- Chat and sessions: `conversations`, `messages`, `chat_sessions`, `chat_messages`, `user_sessions`.
- Memory and knowledge: `user_memories`, `ai_memories`, `knowledge_entries`, `knowledge_nodes`, `knowledge_edges`, `knowledge_snapshots`.
- User features: `agent_tasks`, `user_installed_agents`, `user_notifications`, `user_streaks`, `workspaces` and other whitelisted collections.
- AI usage: `daily_usage`, `usage_analytics`.
- Public/product data: blog, FAQ, announcements, changelog, marketplace and shared-answer collections.

This is an inventory of collection names seen in rules and code, not a normalized schema. Firestore documents are schemaless and call sites define their individual fields.

## Private chat encryption

`src/hooks/useChatPrivateMode.ts` wraps message content and conversation titles before writing them when private mode is enabled. `src/hooks/useE2EE.ts` uses Web Crypto APIs, PBKDF2-derived keys, and AES-GCM. The session key is persisted in `sessionStorage`; private mode also toggles an anonymous-looking UI state for the session.

Practical limits visible in this implementation:

- Private mode is opt-in per session; do not assume every saved conversation is encrypted.
- The anonymous UI state is not account anonymity. Normal Firebase authentication and network/provider behavior still apply.
- Shared and BYOK AI requests still leave the browser for their respective providers. Storage encryption does not mean inference is local.
- Session-key lifetime and recovery depend on browser session storage and the selected key flow. Explain this accurately; do not imply a universal recovery mechanism.

## Secrets and client configuration

Firebase web config and `VITE_*` values are embedded in browser assets and are not private credentials. Provider secrets for shared mode belong in Firebase Functions secret configuration. BYOK keys are user-controlled client-side values. Never add a provider secret to client environment variables or static public files.

## Security review pointers

- Firestore: `firestore.rules`, `firestore.indexes.json`, and `src/integrations/firebase/firestore.ts`.
- Storage: `storage.rules` and `src/integrations/firebase/storage.ts`.
- Function identity/quota/provider proxy: `functions/src/index.ts`.
- Private chat lifecycle: `src/hooks/useChatPrivateMode.ts`, `src/hooks/useE2EE.ts`, and `src/lib/e2e-encryption.ts`.

This guide describes repository behavior, not an independent security audit or certification.
