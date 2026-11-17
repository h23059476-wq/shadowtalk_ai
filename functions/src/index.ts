import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
const cors = require("cors");

admin.initializeApp();

const corsHandler = cors({ origin: true });
// === OpenRouter key pool (Spark-safe) ===
// PRIMARY key uses defineSecret (works on Spark + Blaze).
// ADDITIONAL keys (_2 through _5) are read from process.env, so they work on
// Spark (set via firebase functions:config or .env) without Secret Manager.
// To add more keys on Spark:
//   firebase functions:config:set openrouter.key2="sk-or-v1-..."
//   firebase functions:config:set openrouter.key3="sk-or-v1-..."
//   firebase deploy --only functions
// On Blaze, you can also use Secret Manager:
//   firebase functions:secrets:set OPENROUTER_API_KEY_2
//   (then uncomment the defineSecret lines below)
const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
// const openRouterApiKey2 = defineSecret("OPENROUTER_API_KEY_2"); // Blaze only
// const openRouterApiKey3 = defineSecret("OPENROUTER_API_KEY_3"); // Blaze only
// const openRouterApiKey4 = defineSecret("OPENROUTER_API_KEY_4"); // Blaze only
// const openRouterApiKey5 = defineSecret("OPENROUTER_API_KEY_5"); // Blaze only

/**
 * In-memory key pool with round-robin rotation + per-key cooldown on 429.
 * Survives across warm function invocations. When a key returns 429 or 5xx,
 * markCooldown() pulls it out of rotation for COOLDOWN_MS.
 */
const KEY_COOLDOWN_MS = 60_000;
const allSecrets = [openRouterApiKey]; // primary only — add _2-_5 here when on Blaze

// NOTE: Remote Config was previously used as a key source, but Remote Config
// is client-delivered configuration — any key placed there is recoverable by
// app clients. Removed for security (audit finding ST-02). Use defineSecret()
// (Secret Manager, requires Blaze) or process.env for additional keys.

class KeyPool {
  private keys: string[] = [];
  private cooldowns: Map<string, number> = new Map();
  private nextIndex = 0;

  /**
   * Loads all available keys. Sources (in priority order):
   *   1. defineSecret("OPENROUTER_API_KEY") — primary, works on Spark
   *   2. process.env.OPENROUTER_API_KEY_2..5 — env vars (set via functions:config
   *      or .env file, NOT Remote Config which is client-readable)
   *
   * To add more keys on Spark: create a .env file in functions/ with
   *   OPENROUTER_API_KEY_2=sk-or-v1-...
   *   OPENROUTER_API_KEY_3=sk-or-v1-...
   * Then `firebase deploy --only functions`. The .env file must be gitignored.
   */
  async load(): Promise<string[]> {
    const fromSecrets = allSecrets
      .map((s) => s.value())
      .filter((v): v is string => typeof v === "string" && v.length > 10);
    const fromEnv = [
      process.env.OPENROUTER_API_KEY_2,
      process.env.OPENROUTER_API_KEY_3,
      process.env.OPENROUTER_API_KEY_4,
      process.env.OPENROUTER_API_KEY_5,
    ].filter((v): v is string => typeof v === "string" && v.length > 10);
    // Dedupe across all sources
    const seen = new Set<string>();
    this.keys = [...fromSecrets, ...fromEnv].filter((k) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return this.keys;
  }

  next(): string | null {
    if (this.keys.length === 0) return null;
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.nextIndex + i) % this.keys.length;
      const key = this.keys[idx];
      const cooldownUntil = this.cooldowns.get(key) || 0;
      if (now >= cooldownUntil) {
        this.nextIndex = (idx + 1) % this.keys.length;
        return key;
      }
    }
    // All in cooldown — return the one with soonest expiry
    let soonestKey: string | null = null;
    let soonestExpiry = Infinity;
    for (const key of this.keys) {
      const expiry = this.cooldowns.get(key) || 0;
      if (expiry < soonestExpiry) {
        soonestExpiry = expiry;
        soonestKey = key;
      }
    }
    return soonestKey;
  }

  markCooldown(key: string, durationMs: number = KEY_COOLDOWN_MS): void {
    this.cooldowns.set(key, Date.now() + durationMs);
  }

  size(): number {
    return this.keys.length;
  }
}

const keyPool = new KeyPool();
const SHARED_DAILY_AI_LIMIT = 100;
const SHARED_CHAT_MODEL = "openrouter/free";
const SHARED_IMAGE_MODEL = "google/gemini-2.5-flash-image";

class AiRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function requireAuthenticatedUser(
  authorization: string | undefined,
): Promise<admin.auth.DecodedIdToken> {
  const match = (authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AiRequestError("Unauthorized. Sign in to continue.", 401);
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch {
    throw new AiRequestError("Unauthorized. Sign in to continue.", 401);
  }
}

/**
 * Erase every Firestore row whose explicit owner field matches the caller,
 * plus user-keyed profile/role/entitlement records and private receipt files.
 * This is intentionally idempotent: if an operation fails, the Auth identity
 * remains so the user can reauthenticate and retry the cleanup.
 */
export const deleteAccount = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return;
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

    try {
      const user = await requireAuthenticatedUser(req.headers.authorization);
      // Freshness gate: the token must have been MINTED in the last 5 minutes.
      // `iat` updates on every token refresh, so the client's force-refresh
      // before invoke satisfies this; `auth_time` (the previous check) only
      // moves on full reauthentication, which no client path ever performed —
      // making account deletion impossible for sessions older than 5 minutes.
      if (Date.now() / 1000 - user.iat > 5 * 60) {
        throw new AiRequestError("For security, sign in again before deleting your account.", 401);
      }

      const db = admin.firestore();
      const uid = user.uid;
      const collections = [...new Set([
        "conversations", "messages", "user_sessions", "user_settings", "user_memories",
        "user_notifications", "user_installed_agents", "user_locations", "user_streaks",
        "workspaces", "agent_tasks", "ai_memories", "daily_insights", "knowledge_entries",
        "knowledge_nodes", "knowledge_edges", "knowledge_snapshots", "eco_actions",
        "cyber_scan_results", "cyber_research_projects", "usage_analytics", "whatsapp_links",
        "bug_bounty_submissions", "shadowscale_action_queue", "shadowscale_heartbeats",
        "shadowscale_client_signals", "chat_sessions", "chat_messages", "user_journeys",
        "realtime_channels", "room_presences", "subscribers", "manual_payments", "referrals",
        "cyber_incidents", "cyber_incident_events", "user_referral_codes", "shared_answers",
        "business_memories", "shared_missions", "analytics_events", "daily_usage", "admin_alerts",
        "affiliate_clicks", "api_keys", "automation_scripts", "business_intents", "credit_transactions",
        "custom_models", "gemini_api_keys", "gemini_key_analytics", "gemini_settings", "integrations",
        "mission_actions", "missions", "oauth_tokens", "offline_sync_queue", "personal_llm_conversations",
        "personal_llm_messages", "room_bans", "room_messages", "room_participants", "script_executions",
        "search_history", "security_audits", "security_vulnerabilities", "shadow_credits", "strategy_usage",
        "user_badges", "workspace_branding",
        "admin_alerts", "affiliate_clicks", "business_intents", "custom_models", "gemini_api_keys",
        "gemini_key_analytics", "gemini_settings", "mission_actions", "oauth_tokens", "personal_llm_conversations",
        "personal_llm_messages", "room_bans", "room_messages", "room_participants", "script_executions",
        "threat_actors", "threat_intel_cves", "user_installed_agents", "user_notifications", "user_referral_codes",
        "user_sessions", "whatsapp_links", "workspaces", "user_locations", "user_streaks", "user_memories",
        "conversations", "messages", "profiles", "public_profiles", "referrals", "manual_payments",
        "bug_bounty_submissions", "cyber_incident_events", "cyber_incidents", "cyber_research_projects",
        "cyber_scan_results", "eco_actions", "usage_analytics", "shadowscale_action_queue", "shadowscale_client_signals",
        "shadowscale_heartbeats", "analytics_events", "daily_usage", "daily_insights", "knowledge_entries",
        "knowledge_nodes", "knowledge_edges", "knowledge_snapshots", "agent_tasks", "ai_memories", "api_keys",
        "automation_scripts", "credit_transactions", "integrations", "missions", "offline_sync_queue",
        "search_history", "security_audits", "security_vulnerabilities", "shadow_credits", "strategy_usage",
        "user_badges", "workspace_branding", "user_settings", "user_journeys", "shared_answers", "shared_missions",
        "chat_sessions", "chat_messages", "realtime_channels", "room_presences", "subscribers", "affiliate_clicks",
        "payment_receipts", "user_referral_codes", "user_roles",
      ])];
      const ownerFields = [
        "user_id", "uid", "userId", "owner_id", "owner_uid", "created_by", "created_by_uid",
        "author_id", "user_uid", "actor_id", "target_user_id", "subject_user_id",
      ];
      const refs = new Map<string, admin.firestore.DocumentReference>();

      const ownerQueries = collections.flatMap((collectionName) =>
        ownerFields.map((field) => ({ collectionName, field })),
      );
      for (let offset = 0; offset < ownerQueries.length; offset += 20) {
        const batch = ownerQueries.slice(offset, offset + 20);
        const snapshots = await Promise.all(batch.map(({ collectionName, field }) =>
          db.collection(collectionName).where(field, "==", uid).get(),
        ));
        for (const snapshot of snapshots) {
          for (const record of snapshot.docs) refs.set(record.ref.path, record.ref);
        }
      }
      if (user.email) {
        for (const collectionName of ["subscribers", "manual_payments", "referrals"]) {
          for (const field of ["email", "user_email"]) {
            const snapshot = await db.collection(collectionName).where(field, "==", user.email).get();
            for (const record of snapshot.docs) refs.set(record.ref.path, record.ref);
          }
        }
      }

      for (const collectionName of [
        "user_roles", "profiles", "public_profiles", "api_keys", "integrations", "oauth_tokens",
      ]) {
        refs.set(`${collectionName}/${uid}`, db.collection(collectionName).doc(uid));
      }

      // recursiveDelete also removes documents in nested subcollections.
      for (const ref of refs.values()) await db.recursiveDelete(ref);

      // The only currently used user-scoped Storage folder is payment receipts.
      const bucket = admin.storage().bucket();
      const [receiptFiles] = await bucket.getFiles({ prefix: `payment-receipts/${uid}/` });
      for (const file of receiptFiles) await file.delete({ ignoreNotFound: true });

      // Delete identity last: on any prior failure, the caller can retry cleanup.
      await admin.auth().deleteUser(uid);
      return res.status(200).json({ deleted: true });
    } catch (error) {
      return sendError(res, error);
    }
  });
});

async function requireSharedAiMode(
  db: admin.firestore.Firestore,
  uid: string,
): Promise<void> {
  const snapshot = await db
    .collection("user_settings")
    .where("user_id", "==", uid)
    .where("setting_key", "==", "ai_access_mode")
    .limit(1)
    .get();
  const value = snapshot.docs[0]?.data()?.setting_value;
  const mode = typeof value === "string" ? value : value?.mode;
  if (mode !== "shared") {
    throw new AiRequestError(
      mode === "byok"
        ? "This account uses BYOK. Send the request directly through the selected provider."
        : "Complete AI setup in the chatbot before using shared AI.",
      403,
    );
  }
}

async function reserveSharedAiRequest(
  db: admin.firestore.Firestore,
  uid: string,
): Promise<admin.firestore.DocumentReference> {
  const date = new Date().toISOString().slice(0, 10);
  const usageRef = db.collection("daily_usage").doc(`${uid}_${date}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const used = Number(snapshot.data()?.ai_requests ?? 0);
    if (used >= SHARED_DAILY_AI_LIMIT) {
      throw new AiRequestError(
        "Daily AI limit reached (100 requests). Your limit resets at 00:00 UTC.",
        429,
      );
    }
    transaction.set(
      usageRef,
      {
        user_id: uid,
        usage_date: date,
        ai_requests: used + 1,
      },
      { merge: true },
    );
  });
  return usageRef;
}

async function releaseSharedAiRequest(
  db: admin.firestore.Firestore,
  usageRef: admin.firestore.DocumentReference,
): Promise<void> {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const used = Number(snapshot.data()?.ai_requests ?? 0);
    if (used > 0) transaction.update(usageRef, { ai_requests: used - 1 });
  });
}

function sendError(res: any, error: unknown): void {
  const status = error instanceof AiRequestError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Internal server error";
  if (status >= 500) console.error("AI function error:", error);
  res.status(status).json({ error: message });
}

// ── Shared-chat stream tuning ────────────────────────────────────────────
// `openrouter/free` picks a RANDOM free model per request and free endpoints
// are congested: the first SSE byte can take many seconds, and generations
// regularly run past the 60s default function timeout (which killed the
// instance mid-stream — the "incomplete answer" bug). These knobs bound the
// wait so we fail over fast instead of stalling the user.
const FIRST_CHUNK_TIMEOUT_MS = 20_000;
const HEARTBEAT_INTERVAL_MS = 5_000;
const HEARTBEAT_IDLE_MS = 10_000;

export const chat = onRequest({ secrets: allSecrets, timeoutSeconds: 300 }, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return;
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

    let usageRef: admin.firestore.DocumentReference | null = null;
    let upstreamStarted = false;
    const db = admin.firestore();
    try {
      const user = await requireAuthenticatedUser(req.headers.authorization);
      await requireSharedAiMode(db, user.uid);
      const poolKeys = await keyPool.load();
      if (poolKeys.length === 0) {
        throw new AiRequestError(
          "Shared AI is not configured. Set the OPENROUTER_API_KEY Firebase secret.",
          503,
        );
      }

      const {
        messages,
        stream = true,
        personality,
        deepResearch,
        maxTokens,
        temperature,
        structuredOutput,
      } = req.body || {};
      if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
        throw new AiRequestError("messages must contain between 1 and 40 entries.", 400);
      }
      for (const message of messages) {
        if (
          !message ||
          !["system", "user", "assistant"].includes(message.role) ||
          !(typeof message.content === "string" || Array.isArray(message.content))
        ) {
          throw new AiRequestError("Invalid chat message format.", 400);
        }
      }

      usageRef = await reserveSharedAiRequest(db, user.uid);
      const systemPrompts = [
        "You are ShadowTalk AI, a helpful, accurate, and concise AI assistant.",
      ];
      if (personality && personality !== "default") {
        systemPrompts.push(`Personality mode: ${String(personality).slice(0, 100)}`);
      }
      if (deepResearch) {
        systemPrompts.push(
          "The user has requested deep research. Provide thorough, well-structured analysis with citations where possible.",
        );
      }

// === Multi-key retry loop + first-chunk failover ===
      // If no SSE byte arrives within FIRST_CHUNK_TIMEOUT_MS the request is
      // aborted and the pool re-rolls (next key / next random free model).
      let upstream: Response | null = null;
      let firstChunk: { done: boolean; value?: Uint8Array } | null = null;
      let upstreamReader: { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void> } | null = null;
      let lastError: string | null = null;
      let lastStatus = 502;
      const maxAttempts = Math.max(poolKeys.length, 2); // ≥2 so a single-key pool still gets one re-roll
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const apiKey = keyPool.next();
        if (!apiKey) {
          lastError = "No API keys available in the pool.";
          lastStatus = 503;
          break;
        }
        const attemptController = new AbortController();
        const attemptTimer = setTimeout(() => attemptController.abort(), FIRST_CHUNK_TIMEOUT_MS);
        try {
          upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://shadowtalk-ai-7a513.web.app",
              "X-Title": "ShadowTalk AI",
            },
            body: JSON.stringify({
              model: SHARED_CHAT_MODEL,
              messages: [{ role: "system", content: systemPrompts.join("\n\n") }, ...messages],
              stream: Boolean(stream),
              ...(structuredOutput ? { response_format: { type: "json_object" } } : {}),
              ...(Number.isFinite(Number(temperature))
                ? { temperature: Math.min(2, Math.max(0, Number(temperature))) }
                : {}),
              max_tokens: Math.max(
                256,
                Math.min(
                  16384,
                  Number.isFinite(Number(maxTokens))
                    ? Math.floor(Number(maxTokens))
                    : deepResearch ? 8192 : 8192,
                ),
              ),
            }),
            signal: attemptController.signal,
          });
        } catch (fetchError) {
          clearTimeout(attemptTimer);
          upstream = null;
          lastStatus = 502;
          lastError = `OpenRouter request failed (${(fetchError as Error)?.name || "NetworkError"}) on attempt ${attempt + 1}/${maxAttempts}.`;
          continue;
        }

        if (!upstream.ok) {
          clearTimeout(attemptTimer);
          const detail = (await upstream.text()).slice(0, 500);
          lastStatus = upstream.status === 429 ? 503 : 502;
          lastError = `OpenRouter request failed (${upstream.status}) on attempt ${attempt + 1}/${maxAttempts}. ${detail}`;

          if (upstream.status === 429 || upstream.status >= 500) {
            keyPool.markCooldown(apiKey);
            continue;
          }
          break;
        }

        // Non-streaming: the body is consumed below as JSON; the abort timer
        // only guards the streaming handoff, so disarm it here.
        if (!stream) {
          clearTimeout(attemptTimer);
          break;
        }

        // Wait for the FIRST SSE byte. A queued/congested free model is the
        // main source of "the answer never starts" — bound it and re-roll.
        const reader = upstream.body?.getReader();
        if (!reader) {
          clearTimeout(attemptTimer);
          lastError = "OpenRouter returned an empty response stream.";
          break;
        }
        let chunk: { done: boolean; value?: Uint8Array };
        try {
          chunk = await reader.read();
        } catch {
          chunk = { done: true }; // aborted by the timer or connection reset
        }
        clearTimeout(attemptTimer);
        if (!chunk.done && chunk.value) {
          firstChunk = chunk;
          upstreamReader = reader;
          break;
        }
        // Nothing arrived in time — fail over.
        void reader.cancel().catch(() => {});
        upstream = null;
        keyPool.markCooldown(apiKey);
        lastStatus = 503;
        lastError = `OpenRouter did not start responding within ${FIRST_CHUNK_TIMEOUT_MS / 1000}s (attempt ${attempt + 1}/${maxAttempts}).`;
      }

      if (!upstream || !upstream.ok) {
        await releaseSharedAiRequest(db, usageRef);
        usageRef = null;
        return res.status(lastStatus).json({
          error: lastError || "OpenRouter request failed after trying all pool keys.",
        });
      }

      upstreamStarted = true;
      void db.collection("usage_analytics").add({
        user_id: user.uid,
        action_type: deepResearch ? "deep_research" : "chat_message",
        feature_used: `openrouter:${SHARED_CHAT_MODEL}`,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      }).catch((error) => console.error("Failed to record shared AI usage:", error));

      if (!stream) return res.json(await upstream.json());

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Provider", "openrouter");
      res.setHeader("X-Model", SHARED_CHAT_MODEL);
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const reader = upstreamReader!;
      const decoder = new TextDecoder();
      let finished = false;
      let lastWriteAt = Date.now();
      // Keep-alive during upstream stalls: free models can sit silent for
      // >30s mid-generation. Without periodic bytes the load balancer reaps
      // the connection — the client saw a truncated answer with no error.
      // SSE comment lines (": ping") are skipped by every client parser.
      const heartbeat = setInterval(() => {
        if (finished || res.writableEnded) return;
        if (Date.now() - lastWriteAt > HEARTBEAT_IDLE_MS) {
          res.write(": ping\n\n");
          lastWriteAt = Date.now();
        }
      }, HEARTBEAT_INTERVAL_MS);
      // Stop burning upstream tokens when the client hangs up mid-stream —
      // previously an abandoned chat kept generating until the model finished.
      const abortUpstream = () => {
        if (!finished) void reader.cancel().catch(() => {});
      };
      res.on("close", abortUpstream);

      try {
        let chunk: { done: boolean; value?: Uint8Array } | null = firstChunk;
        while (chunk && !chunk.done) {
          res.write(decoder.decode(chunk.value!, { stream: true }));
          lastWriteAt = Date.now();
          chunk = await reader.read();
        }
        const tail = decoder.decode(); // flush any truncated multi-byte sequence
        if (tail && !res.writableEnded) res.write(tail);
      } finally {
        finished = true;
        clearInterval(heartbeat);
        res.off("close", abortUpstream);
        // Release the upstream connection (harmless no-op once `done`).
        void reader.cancel().catch(() => {});
      }
      return res.end();
    } catch (error) {
      if (usageRef && !upstreamStarted) {
        await releaseSharedAiRequest(db, usageRef).catch((releaseError) =>
          console.error("Failed to release AI request reservation:", releaseError),
        );
      }
      if (upstreamStarted && res.headersSent && !res.writableEnded) {
        // Mid-stream failure: writing JSON here would corrupt the SSE body.
        // Emit an error EVENT instead — the client already surfaces
        // `data: {"error": ...}` alongside the partial answer.
        const message = error instanceof Error ? error.message : "The AI stream failed mid-generation.";
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        return res.end();
      }
      return sendError(res, error);
    }
  });
});

export const audio = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return;
    try {
      await requireAuthenticatedUser(req.headers.authorization);
      return res.status(501).json({ error: "Audio generation is not implemented on this endpoint." });
    } catch (error) {
      return sendError(res, error);
    }
  });
});

export const drive = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return;
    try {
      await requireAuthenticatedUser(req.headers.authorization);
      return res.status(501).json({ error: "Google Drive access is not implemented on this endpoint." });
    } catch (error) {
      return sendError(res, error);
    }
  });
});

export const generateImage = onRequest({ secrets: allSecrets, timeoutSeconds: 120 }, (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return;
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

    const db = admin.firestore();
    let usageRef: admin.firestore.DocumentReference | null = null;
    let upstreamStarted = false;
    try {
      const user = await requireAuthenticatedUser(req.headers.authorization);
      await requireSharedAiMode(db, user.uid);
      const poolKeys = await keyPool.load();
      if (poolKeys.length === 0) {
        throw new AiRequestError(
          "Shared image generation is not configured. Set the OPENROUTER_API_KEY Firebase secret.",
          503,
        );
      }

      const { prompt, referenceImage } = req.body || {};
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
        throw new AiRequestError("prompt must be a non-empty string under 4000 characters.", 400);
      }
      if (
        referenceImage !== undefined &&
        (typeof referenceImage !== "string" ||
          !referenceImage.startsWith("data:image/") ||
          referenceImage.length > 8_000_000)
      ) {
        throw new AiRequestError("referenceImage must be an image data URL under 8 MB.", 400);
      }

      usageRef = await reserveSharedAiRequest(db, user.uid);
      const content = referenceImage
        ? [
            { type: "text", text: prompt.trim() },
            { type: "image_url", image_url: { url: referenceImage } },
          ]
        : prompt.trim();
// === Multi-key retry loop (same pattern as chat) ===
      let upstream: Response | null = null;
      let lastError: string | null = null;
      let lastStatus = 502;
      for (let attempt = 0; attempt < poolKeys.length; attempt++) {
        const apiKey = keyPool.next();
        if (!apiKey) {
          lastError = "No API keys available in the pool.";
          lastStatus = 503;
          break;
        }
        upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://shadowtalk-ai-7a513.web.app",
            "X-Title": "ShadowTalk AI",
          },
          body: JSON.stringify({
            model: SHARED_IMAGE_MODEL,
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
            stream: false,
          }),
        });
        if (upstream.ok) break;
        const detail = (await upstream.text()).slice(0, 500);
        lastStatus = upstream.status === 429 ? 503 : 502;
        lastError = `OpenRouter image request failed (${upstream.status}) on key ${attempt + 1}/${poolKeys.length}. ${detail}`;
        if (upstream.status === 429 || upstream.status >= 500) {
          keyPool.markCooldown(apiKey);
          continue;
        }
        break;
      }

      if (!upstream || !upstream.ok) {
        await releaseSharedAiRequest(db, usageRef);
        usageRef = null;
        return res.status(lastStatus).json({
          error: lastError || "OpenRouter image request failed after trying all pool keys.",
        });
      }

      upstreamStarted = true;
      const result = await upstream.json() as {
        choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
      };
      const imageUrl = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl || !imageUrl.startsWith("data:image/")) {
        throw new AiRequestError("OpenRouter returned no generated image.", 502);
      }

      void db.collection("usage_analytics").add({
        user_id: user.uid,
        action_type: "generate_image",
        feature_used: `openrouter:${SHARED_IMAGE_MODEL}`,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      }).catch((error) => console.error("Failed to record shared image usage:", error));

      return res.json({ data: [{ b64_json: imageUrl }] });
    } catch (error) {
      if (usageRef && !upstreamStarted) {
        await releaseSharedAiRequest(db, usageRef).catch((releaseError) =>
          console.error("Failed to release AI request reservation:", releaseError),
        );
      }
      return sendError(res, error);
    }
  });
});

/**
 * Feedback email delivery.
 *
 * Every contact/feedback submission is forwarded to the founder's inbox:
 *   zain@shadowtalk-ai.com  (override with FEEDBACK_TO_EMAIL in functions/.env)
 *
 * Two delivery paths, first match wins:
 *   1. Resend HTTP API — used when RESEND_API_KEY is set. Recommended: create
 *      a free account at resend.com, verify shadowtalk-ai.com, then put
 *      RESEND_API_KEY=re_... in functions/.env and redeploy.
 *   2. Firestore `mail` collection — used when no API key is set. Documents
 *      follow the schema of the official "Trigger Email from Firestore"
 *      extension; install it with SMTP credentials and queued docs are
 *      delivered automatically. If the extension is not installed, queued
 *      docs simply wait — nothing is lost.
 *
 * Either way the original submission is always persisted to the
 * `contact_messages` collection first, so feedback is never lost even when
 * email delivery fails. Delivery is best-effort and never fails the request.
 */
const FEEDBACK_TO_EMAIL = process.env.FEEDBACK_TO_EMAIL || "zain@shadowtalk-ai.com";
const FEEDBACK_FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || "ShadowTalk AI <feedback@shadowtalk-ai.com>";

type FeedbackDeliveryStatus = "sent" | "queued" | "not_configured" | "failed";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function deliverFeedbackEmail(message: {
  subject: string;
  text: string;
  html: string;
  replyTo: string | null;
}): Promise<{ status: FeedbackDeliveryStatus; detail: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FEEDBACK_FROM_EMAIL,
          to: [FEEDBACK_TO_EMAIL],
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        console.error("Feedback email delivery failed (Resend):", response.status, detail);
        return { status: "failed", detail: `Resend ${response.status}: ${detail}` };
      }
      return { status: "sent", detail: "resend" };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("Feedback email delivery error (Resend):", error);
      return { status: "failed", detail };
    }
  }

  // No Resend key — queue in the `mail` collection for the Trigger Email
  // extension (Admin SDK write, bypasses security rules).
  try {
    await admin.firestore().collection("mail").add({
      to: FEEDBACK_TO_EMAIL,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      message: {
        subject: message.subject,
        text: message.text,
        html: message.html,
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
      status: "queued",
      detail: "mail collection — install the Trigger Email extension or set RESEND_API_KEY to deliver",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Failed to queue feedback email:", error);
    return { status: "failed", detail };
  }
}

/**
 * Contact / waitlist intake (final completion phase).
 *
 * Both contact surfaces (ContactPage, AboutForms) and the in-app FeedbackForm
 * invoke this function. Messages are persisted to the `contact_messages`
 * Firestore intake collection (the same destination the security rules'
 * `isValidIntake()` path was designed for), where admins can read them, and
 * additionally forwarded by email to zain@shadowtalk-ai.com (see
 * deliverFeedbackEmail above).
 *
 * Anonymous submission is intentional (matches the client rules), so the
 * caller's ID token is optional; when a valid one is presented, the uid and
 * email are attached to the stored message.
 *
 * Validation mirrors the client-side firestore.rules intake constraints so a
 * message rejected here would also be rejected by the rules path.
 */
export const sendContactEmail = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") return;
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const source = typeof body.source === "string" ? body.source.slice(0, 120) : "website";

      if (!name || name.length > 256) throw new AiRequestError("Name is required (max 256 characters).", 400);
      // Email is optional (anonymous in-app feedback may omit it); when it is
      // present it must be well-formed and reasonably sized.
      if (email && (email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        throw new AiRequestError("A valid email is required.", 400);
      }
      if (subject.length > 256) throw new AiRequestError("Subject is too long (max 256 characters).", 400);
      if (!message || message.length > 5000) throw new AiRequestError("Message is required (max 5000 characters).", 400);

      // Best-effort identity attachment — intake is anonymous-friendly.
      let uid: string | null = null;
      let userEmail: string | null = null;
      try {
        const user = await requireAuthenticatedUser(req.headers.authorization);
        uid = user.uid;
        userEmail = user.email ?? null;
      } catch {
        /* anonymous submission */
      }

      // Compose and deliver the notification email to the founder's inbox.
      const submittedAt = new Date().toISOString();
      const emailSubject = `[ShadowTalk AI] ${subject || "General Inquiry"}`;
      const identityLine = uid
        ? `Signed in as ${uid}${userEmail ? ` (${userEmail})` : ""}`
        : "Not signed in (anonymous submission)";
      const textBody = [
        `New message submitted on ShadowTalk AI — source: ${source}.`,
        "",
        `Name: ${name}`,
        `Email: ${email || "not provided"}`,
        identityLine,
        `Submitted: ${submittedAt}`,
        "",
        "Message:",
        message,
      ].join("\n");
      const htmlBody = [
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px">',
        '<h2 style="margin:0 0 4px">New ShadowTalk AI message</h2>',
        `<p style="color:#555;margin:0 0 16px">Source: ${escapeHtml(source)} &middot; Submitted ${escapeHtml(submittedAt)}</p>`,
        '<table style="border-collapse:collapse;margin-bottom:16px">',
        `<tr><td style="color:#555;padding:2px 12px 2px 0">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>`,
        `<tr><td style="color:#555;padding:2px 12px 2px 0">Email</td><td>${email ? escapeHtml(email) : "<em>not provided</em>"}</td></tr>`,
        `<tr><td style="color:#555;padding:2px 12px 2px 0">Account</td><td>${escapeHtml(identityLine)}</td></tr>`,
        "</table>",
        `<div style="white-space:pre-wrap;background:#f6f6f6;border:1px solid #e5e5e5;border-radius:8px;padding:16px">${escapeHtml(message)}</div>`,
        '<p style="color:#888;font-size:12px;margin-top:16px">A copy of this message is stored in the Firestore &quot;contact_messages&quot; collection.</p>',
        "</div>",
      ].join("");

      let delivery: { status: FeedbackDeliveryStatus; detail: string };
      try {
        delivery = await deliverFeedbackEmail({
          subject: emailSubject,
          text: textBody,
          html: htmlBody,
          replyTo: email || null,
        });
      } catch (deliveryError) {
        // Storage below must never depend on email delivery succeeding.
        delivery = {
          status: "failed",
          detail: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
        };
      }

      const db = admin.firestore();
      await db.collection("contact_messages").add({
        name,
        email: email || null,
        subject: subject || "General Inquiry",
        message,
        source,
        user_id: uid,
        identity_email: userEmail,
        status: "received",
        email_delivery: delivery.status,
        email_delivery_detail: delivery.detail.slice(0, 300),
        notified_email: FEEDBACK_TO_EMAIL,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ ok: true, email_delivery: delivery.status });
    } catch (error) {
      return sendError(res, error);
    }
  });
});
