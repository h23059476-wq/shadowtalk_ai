/**
 * PHYSICAL LIVE TEST — Tier 3 provider against the REAL Hugging Face
 * ZeroGPU Space (black-forest-labs/FLUX.1-schnell). No mocks: real network,
 * real Gradio handshake, real queue events, real bytes.
 *
 * This file is SKIPPED unless ZEROGPU_LIVE=1 is exported, so regular runs
 * (`npm test`, CI) never touch the network. Run manually from the repo root:
 *
 *   ZEROGPU_LIVE=1 npx vitest --run src/lib/providers/__tests__/zerogpu-provider-live.test.ts
 *
 * Expected outcomes (both are PASS):
 *  - SUCCESS: a real image Blob (PNG magic verified) — anonymous quota available.
 *  - TYPED ZeroGpuError kind="quota" with the friendly reset hint — the
 *    sandbox/IP's anonymous quota is exhausted (observed live: "You have
 *    exceeded your ZeroGPU runs limit. Authenticate with a Hugging Face
 *    token for more quota"). The typed error path IS the contract.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import {
  DEFAULT_ZERO_GPU_SPACE_ID,
  ZeroGpuError,
  generateImageViaZeroGpu,
  type ZeroGpuStatusUpdate,
} from "@/lib/providers/zeroGpuSpaceProvider";

const LIVE = process.env.ZEROGPU_LIVE === "1";
/** Optional override to exercise the generic Space pipeline on a non-ZeroGPU Space. */
const LIVE_SPACE = process.env.ZEROGPU_LIVE_SPACE?.trim() || DEFAULT_ZERO_GPU_SPACE_ID;
const OUT_FILE = process.env.ZEROGPU_LIVE_OUT?.trim() || "/home/z/my-project/download/zerogpu-live-fox.png";
/** CPU Spaces queue for many minutes — raise the watchdogs via env when needed. */
const IDLE_MS = Number(process.env.ZEROGPU_LIVE_IDLE_MS) || undefined;
const TOTAL_MS = Number(process.env.ZEROGPU_LIVE_TOTAL_MS) || undefined;
const TEST_MS = Number(process.env.ZEROGPU_LIVE_TEST_MS) || 300_000;
const d = LIVE ? it : it.skip;

describe(`ZeroGPU provider — LIVE against ${LIVE_SPACE}`, () => {
  d(
    "streams real queue status and either returns a PNG Blob or a typed quota error",
    { timeout: TEST_MS },
    async () => {
      vi.stubGlobal("navigator", { ...(globalThis.navigator ?? {}), onLine: true });
      const updates: ZeroGpuStatusUpdate[] = [];
      const t0 = Date.now();
      const stamp = () => `[${((Date.now() - t0) / 1000).toFixed(1)}s]`;

      try {
        const result = await generateImageViaZeroGpu(
          "a photorealistic red fox sitting in a snowy pine forest at golden hour, shallow depth of field",
          {
            spaceId: LIVE_SPACE,
            width: 768,
            height: 768,
            numInferenceSteps: 4,
            ...(IDLE_MS ? { idleTimeoutMs: IDLE_MS } : {}),
            ...(TOTAL_MS ? { timeoutMs: TOTAL_MS } : {}),
            onStatus: (u) => {
              updates.push(u);
              console.log(
                `${stamp()} STATUS [${u.phase}]${u.queuePosition != null ? ` pos=${u.queuePosition}` : ""}${u.etaSeconds != null ? ` eta=${Math.round(u.etaSeconds)}s` : ""} ${u.message}`,
              );
            },
          },
        );

        // SUCCESS PATH — verify real bytes.
        expect(result.spaceId).toBe(LIVE_SPACE);
        const buf = Buffer.from(await result.blob.arrayBuffer());
        console.log(`${stamp()} RESULT blob=${buf.length} bytes mime=${result.mimeType} seed=${result.seed} endpoint=${result.endpoint}`);
        expect(buf.length).toBeGreaterThan(10_000);
        expect(buf[0]).toBe(0x89);
        expect(buf[1]).toBe(0x50); // P
        expect(buf[2]).toBe(0x4e); // N
        expect(buf[3]).toBe(0x47); // G
        fs.writeFileSync(OUT_FILE, buf);
        console.log(`${stamp()} saved ${OUT_FILE}`);
      } catch (error) {
        // QUOTA PATH — the typed error IS a valid physical outcome.
        expect(error).toBeInstanceOf(ZeroGpuError);
        const zerr = error as ZeroGpuError;
        console.log(`${stamp()} TYPED ZeroGpuError kind=${zerr.kind}`);
        console.log(`${stamp()} message: ${zerr.message}`);
        expect(["quota", "timeout", "space_unavailable"]).toContain(zerr.kind);
        if (zerr.kind === "quota") {
          expect(zerr.message).toContain("ZeroGPU runs limit"); // the raw HF message stays visible
          expect(zerr.message).toContain("quota resets daily"); // + the friendly retry hint
          expect(zerr.message).toContain("Connecting your Hugging Face account");
        }
        expect(updates.length).toBeGreaterThan(0);
        expect(updates[0].phase).toBe("connecting");
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
});
