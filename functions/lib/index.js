"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImage = exports.drive = exports.audio = exports.chat = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
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
const openRouterApiKey = (0, params_1.defineSecret)("OPENROUTER_API_KEY");
// const openRouterApiKey2 = defineSecret("OPENROUTER_API_KEY_2"); // Blaze only
// const openRouterApiKey3 = defineSecret("OPENROUTER_API_KEY_3"); // Blaze only
// const openRouterApiKey4 = defineSecret("OPENROUTER_API_KEY_4"); // Blaze only
// const openRouterApiKey5 = defineSecret("OPENROUTER_API_KEY_5"); // Blaze only
/**
 * In-memory key pool with round-robin rotation + per-key cooldown on 429.
 * Survives across warm function invocations. When a key returns 429 or 5xx,
 * markCooldown() pulls it out of rotation for COOLDOWN_MS.
 */
const KEY_COOLDOWN_MS = 60000;
const allSecrets = [openRouterApiKey]; // primary only — add _2-_5 here when on Blaze
// NOTE: Remote Config was previously used as a key source, but Remote Config
// is client-delivered configuration — any key placed there is recoverable by
// app clients. Removed for security (audit finding ST-02). Use defineSecret()
// (Secret Manager, requires Blaze) or process.env for additional keys.
class KeyPool {
    constructor() {
        this.keys = [];
        this.cooldowns = new Map();
        this.nextIndex = 0;
    }
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
    async load() {
        const fromSecrets = allSecrets
            .map((s) => s.value())
            .filter((v) => typeof v === "string" && v.length > 10);
        const fromEnv = [
            process.env.OPENROUTER_API_KEY_2,
            process.env.OPENROUTER_API_KEY_3,
            process.env.OPENROUTER_API_KEY_4,
            process.env.OPENROUTER_API_KEY_5,
        ].filter((v) => typeof v === "string" && v.length > 10);
        // Dedupe across all sources
        const seen = new Set();
        this.keys = [...fromSecrets, ...fromEnv].filter((k) => {
            if (seen.has(k))
                return false;
            seen.add(k);
            return true;
        });
        return this.keys;
    }
    next() {
        if (this.keys.length === 0)
            return null;
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
        let soonestKey = null;
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
    markCooldown(key, durationMs = KEY_COOLDOWN_MS) {
        this.cooldowns.set(key, Date.now() + durationMs);
    }
    size() {
        return this.keys.length;
    }
}
const keyPool = new KeyPool();
const SHARED_DAILY_AI_LIMIT = 100;
const SHARED_CHAT_MODEL = "openrouter/free";
const SHARED_IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";
class AiRequestError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
async function requireAuthenticatedUser(authorization) {
    const match = (authorization || "").match(/^Bearer\s+(.+)$/i);
    if (!match)
        throw new AiRequestError("Unauthorized. Sign in to continue.", 401);
    try {
        return await admin.auth().verifyIdToken(match[1]);
    }
    catch {
        throw new AiRequestError("Unauthorized. Sign in to continue.", 401);
    }
}
async function requireSharedAiMode(db, uid) {
    const snapshot = await db
        .collection("user_settings")
        .where("user_id", "==", uid)
        .where("setting_key", "==", "ai_access_mode")
        .limit(1)
        .get();
    const value = snapshot.docs[0]?.data()?.setting_value;
    const mode = typeof value === "string" ? value : value?.mode;
    if (mode !== "shared") {
        throw new AiRequestError(mode === "byok"
            ? "This account uses BYOK. Send the request directly through the selected provider."
            : "Complete AI setup in the chatbot before using shared AI.", 403);
    }
}
async function reserveSharedAiRequest(db, uid) {
    const date = new Date().toISOString().slice(0, 10);
    const usageRef = db.collection("daily_usage").doc(`${uid}_${date}`);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(usageRef);
        const used = Number(snapshot.data()?.ai_requests ?? 0);
        if (used >= SHARED_DAILY_AI_LIMIT) {
            throw new AiRequestError("Daily AI limit reached (100 requests). Your limit resets at 00:00 UTC.", 429);
        }
        transaction.set(usageRef, {
            user_id: uid,
            usage_date: date,
            ai_requests: used + 1,
        }, { merge: true });
    });
    return usageRef;
}
async function releaseSharedAiRequest(db, usageRef) {
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(usageRef);
        const used = Number(snapshot.data()?.ai_requests ?? 0);
        if (used > 0)
            transaction.update(usageRef, { ai_requests: used - 1 });
    });
}
function sendError(res, error) {
    const status = error instanceof AiRequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Internal server error";
    if (status >= 500)
        console.error("AI function error:", error);
    res.status(status).json({ error: message });
}
exports.chat = (0, https_1.onRequest)({ secrets: allSecrets }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === "OPTIONS")
            return;
        if (req.method !== "POST")
            return res.status(405).json({ error: "Method not allowed." });
        let usageRef = null;
        let upstreamStarted = false;
        const db = admin.firestore();
        try {
            const user = await requireAuthenticatedUser(req.headers.authorization);
            await requireSharedAiMode(db, user.uid);
            const poolKeys = await keyPool.load();
            if (poolKeys.length === 0) {
                throw new AiRequestError("Shared AI is not configured. Set the OPENROUTER_API_KEY Firebase secret.", 503);
            }
            const { messages, stream = true, personality, deepResearch, maxTokens, structuredOutput, } = req.body || {};
            if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
                throw new AiRequestError("messages must contain between 1 and 40 entries.", 400);
            }
            for (const message of messages) {
                if (!message ||
                    !["system", "user", "assistant"].includes(message.role) ||
                    !(typeof message.content === "string" || Array.isArray(message.content))) {
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
                systemPrompts.push("The user has requested deep research. Provide thorough, well-structured analysis with citations where possible.");
            }
            // === Multi-key retry loop ===
            let upstream = null;
            let lastError = null;
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
                        model: SHARED_CHAT_MODEL,
                        messages: [{ role: "system", content: systemPrompts.join("\n\n") }, ...messages],
                        stream: Boolean(stream),
                        ...(structuredOutput ? { response_format: { type: "json_object" } } : {}),
                        max_tokens: Math.max(256, Math.min(16384, Number.isFinite(Number(maxTokens))
                            ? Math.floor(Number(maxTokens))
                            : deepResearch ? 8192 : 8192)),
                    }),
                });
                if (upstream.ok)
                    break;
                const detail = (await upstream.text()).slice(0, 500);
                lastStatus = upstream.status === 429 ? 503 : 502;
                lastError = `OpenRouter request failed (${upstream.status}) on key ${attempt + 1}/${poolKeys.length}. ${detail}`;
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
            if (!stream)
                return res.json(await upstream.json());
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Provider", "openrouter");
            res.setHeader("X-Model", SHARED_CHAT_MODEL);
            const reader = upstream.body?.getReader();
            if (!reader)
                throw new Error("OpenRouter returned an empty response stream.");
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                res.write(decoder.decode(value, { stream: true }));
            }
            return res.end();
        }
        catch (error) {
            if (usageRef && !upstreamStarted) {
                await releaseSharedAiRequest(db, usageRef).catch((releaseError) => console.error("Failed to release AI request reservation:", releaseError));
            }
            return sendError(res, error);
        }
    });
});
exports.audio = (0, https_1.onRequest)((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === "OPTIONS")
            return;
        try {
            await requireAuthenticatedUser(req.headers.authorization);
            const { prompt, duration, type } = req.body || {};
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return res.json({
                audioUrl: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
                prompt,
                type,
                duration,
            });
        }
        catch (error) {
            return sendError(res, error);
        }
    });
});
exports.drive = (0, https_1.onRequest)((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === "OPTIONS")
            return;
        try {
            await requireAuthenticatedUser(req.headers.authorization);
            const { action, params } = req.body || {};
            if (action === "drive.list") {
                return res.json({
                    data: [
                        { id: "mock-1", name: "Q3 Strategy Presentation.pptx", mimeType: "presentation", modifiedTime: new Date().toISOString() },
                        { id: "mock-2", name: "Financial Projections 2024.xlsx", mimeType: "spreadsheet", modifiedTime: new Date(Date.now() - 86400000).toISOString() },
                        { id: "mock-3", name: "Product Requirements Doc.docx", mimeType: "document", modifiedTime: new Date(Date.now() - 7 * 86400000).toISOString() },
                    ],
                });
            }
            if (action === "drive.get") {
                return res.json({
                    data: { content: `# Mock File\n\n[Imported mock content from Google Drive for file ID: ${params?.fileId}]` },
                });
            }
            return res.status(400).json({ error: "Unknown action" });
        }
        catch (error) {
            return sendError(res, error);
        }
    });
});
exports.generateImage = (0, https_1.onRequest)({ secrets: allSecrets }, (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method === "OPTIONS")
            return;
        if (req.method !== "POST")
            return res.status(405).json({ error: "Method not allowed." });
        const db = admin.firestore();
        let usageRef = null;
        let upstreamStarted = false;
        try {
            const user = await requireAuthenticatedUser(req.headers.authorization);
            await requireSharedAiMode(db, user.uid);
            const poolKeys = await keyPool.load();
            if (poolKeys.length === 0) {
                throw new AiRequestError("Shared image generation is not configured. Set the OPENROUTER_API_KEY Firebase secret.", 503);
            }
            const { prompt, referenceImage } = req.body || {};
            if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
                throw new AiRequestError("prompt must be a non-empty string under 4000 characters.", 400);
            }
            if (referenceImage !== undefined &&
                (typeof referenceImage !== "string" ||
                    !referenceImage.startsWith("data:image/") ||
                    referenceImage.length > 8000000)) {
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
            let upstream = null;
            let lastError = null;
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
                if (upstream.ok)
                    break;
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
            const result = await upstream.json();
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
        }
        catch (error) {
            if (usageRef && !upstreamStarted) {
                await releaseSharedAiRequest(db, usageRef).catch((releaseError) => console.error("Failed to release AI request reservation:", releaseError));
            }
            return sendError(res, error);
        }
    });
});
//# sourceMappingURL=index.js.map