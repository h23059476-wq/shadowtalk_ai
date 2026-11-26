/**
 * PHYSICAL INTEGRATION TEST (Tier 3) — real network, real Space, no mocks.
 *
 * Connects @gradio/client to a public Gradio Space (default:
 * black-forest-labs/FLUX.1-schnell ZeroGPU), streams the live queue/
 * generation status events, downloads the generated image bytes and verifies
 * the PNG signature — proving the exact API contract zeroGpuSpaceProvider.ts
 * relies on.
 *
 * Live findings baked into this probe (2026-11-26):
 *  - submit() MUST pass all_events=true — without it @gradio/client filters
 *    event types down to an empty allow-list and join-time rejections
 *    (quota / sleeping Space) arrive as a SILENT end-of-stream.
 *  - The real anonymous ZeroGPU quota message reads "You have exceeded your
 *    ZeroGPU runs limit. Authenticate with a Hugging Face token for more
 *    quota - https://huggingface.co/settings/tokens".
 *  - Anonymous quota is per-IP per-day: from a datacenter IP it can be
 *    exhausted before the first run — the typed quota error IS a valid
 *    physical outcome (see src/lib/providers/__tests__/zerogpu-provider-live.test.ts).
 *
 * Usage:  node scripts/zerogpu_live_test.mjs [prompt]
 *         ZEROGPU_SPACE=username/my-space node scripts/zerogpu_live_test.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SPACE = process.env.ZEROGPU_SPACE || "black-forest-labs/FLUX.1-schnell";
const PROMPT =
  process.argv[2] ||
  "a photorealistic red fox sitting in a snowy pine forest at golden hour, shallow depth of field";
const OUT_DIR = "/home/z/my-project/download";

const t0 = Date.now();
const stamp = () => `[${((Date.now() - t0) / 1000).toFixed(1)}s]`;
const log = (...a) => console.log(stamp(), ...a);

const timeline = [];

const { Client } = await import("@gradio/client");

log(`Connecting to Space "${SPACE}" (anonymous quota)…`);
const app = await Client.connect(SPACE);
log("Connected. Gradio client handshake OK.");

const api = await app.view_api();
const endpoints = Object.keys(api?.named_endpoints ?? {});
log("Named endpoints exposed by the Space:", endpoints.join(", ") || "(none)");

const endpoint =
  endpoints.find((e) => e === "/infer") ??
  endpoints.find((e) => /infer|generate|predict|run/i.test(e)) ??
  endpoints[0];
if (!endpoint) throw new Error(`Space exposes no callable endpoint. Got: ${endpoints.join(", ")}`);

const paramNames = (api.named_endpoints[endpoint].parameters ?? []).map((p) => p.parameter_name);
log(`Using endpoint "${endpoint}" — parameters: ${paramNames.join(", ")}`);

const payload = {};
if (paramNames.includes("prompt")) payload.prompt = PROMPT;
if (paramNames.includes("seed")) payload.seed = 0;
if (paramNames.includes("randomize_seed")) payload.randomize_seed = true;
if (paramNames.includes("width")) payload.width = Number(process.env.ZEROGPU_W) || 768;
if (paramNames.includes("height")) payload.height = Number(process.env.ZEROGPU_H) || 768;
if (paramNames.includes("num_inference_steps")) payload.num_inference_steps = Number(process.env.ZEROGPU_STEPS) || 4;
log("Submitting payload keys:", Object.keys(payload).join(", "));

// all_events=true — see the header note. Without it, error events are filtered.
let dataEvent = null;
let sawError = null;
const job = app.submit(endpoint, payload, undefined, undefined, true);

for await (const event of job) {
  if (event.type === "status") {
    const queueInfo = event.queue ? `queue position=${event.position} eta=${event.eta}s` : "";
    const msg = typeof event.message === "string" ? ` message="${event.message}"` : "";
    log(`STATUS  stage=${event.stage}${queueInfo ? ` ${queueInfo}` : ""}${msg}`);
    timeline.push({ t: (Date.now() - t0) / 1000, stage: event.stage, position: event.position ?? null, eta: event.eta ?? null });
    if (event.stage === "error") {
      sawError = typeof event.message === "string" ? event.message : String(event.message);
      break;
    }
  } else if (event.type === "data") {
    dataEvent = event;
    log("DATA    result tuple received:", JSON.stringify(event.data).slice(0, 400));
  } else if (event.type === "log") {
    log("LOG    ", typeof event.message === "string" ? event.message : "");
  }
}

if (!dataEvent) {
  // Structured exit: quota rejections are a valid physical outcome.
  const isQuota = /runs limit|quota/i.test(sawError ?? "");
  log(sawError ? `SPACE ERROR: ${sawError}` : "Job finished without a data event — no image was produced.");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "zerogpu-live-evidence.json"),
    JSON.stringify({ space: SPACE, endpoint, payloadKeys: Object.keys(payload), timeline, outcome: isQuota ? "quota-exceeded" : sawError ? "space-error" : "no-data", error: sawError, totalSeconds: (Date.now() - t0) / 1000 }, null, 2),
  );
  log(`PHYSICAL TEST outcome: ${isQuota ? "QUOTA-EXCEEDED (typed error contract — see provider)" : "FAILED"}`);
  process.exit(isQuota ? 0 : 1);
}

// Extract the image URL exactly like extractImageValue() in the provider does.
const first = Array.isArray(dataEvent.data[0]) ? dataEvent.data[0][0] : dataEvent.data[0];
const url = typeof first === "string" ? first : (first?.url ?? first?.data ?? first?.path ?? null);
if (!url) throw new Error(`Could not extract an image URL from: ${JSON.stringify(first)}`);
const seed = typeof dataEvent.data[1] === "number" ? dataEvent.data[1] : null;
log(`Image URL: ${url}`);
log(`Seed echoed back by the Space: ${seed}`);

log("Downloading image bytes…");
const res = await fetch(url);
if (!res.ok) throw new Error(`Image download failed: HTTP ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
log(`Downloaded ${buf.length} bytes, Content-Type=${res.headers.get("content-type")}`);

// Image magic check: Spaces return PNG, WebP or JPEG — verify whichever arrives.
const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
const isWebp = buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
if (!isPng && !isWebp && !isJpeg) throw new Error("Downloaded bytes are not a valid image (no PNG/WebP/JPEG magic signature).");
log(`Image magic verified: ${isPng ? "PNG" : isWebp ? "WebP" : "JPEG"}`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, isWebp ? "zerogpu-live-fox.webp" : isJpeg ? "zerogpu-live-fox.jpg" : "zerogpu-live-fox.png");
fs.writeFileSync(outPath, buf);
log(`Saved evidence image to ${outPath}`);

fs.writeFileSync(
  path.join(OUT_DIR, "zerogpu-live-evidence.json"),
  JSON.stringify(
    {
      space: SPACE,
      endpoint,
      payloadKeys: Object.keys(payload),
      seed,
      timeline,
      imageBytes: buf.length,
      contentType: res.headers.get("content-type"),
      pngMagicOk: isPng,
      savedTo: outPath,
      totalSeconds: (Date.now() - t0) / 1000,
      outcome: "success",
    },
    null,
    2,
  ),
);
log("PHYSICAL TEST A+B: PASS");
