#!/usr/bin/env node
/**
 * Copy the onnxruntime-web WASM runtime binaries into public/onnx/ so
 * transformers.js never touches the jsdelivr CDN at runtime.
 *
 * WHY THIS EXISTS: @huggingface/transformers v3 defaults
 * `env.backends.onnx.wasm.wasmPaths` to
 * `https://cdn.jsdelivr.net/npm/@huggingface/transformers@<ver>/dist/` —
 * an external CDN request on every cold session. ShadowTalk is offline-first:
 * the ONLY first-use network source allowed is the Hugging Face Hub (weights),
 * so the ORT runtime must ship with the app. The worker pins
 * `wasmPaths = '/onnx/'` and this script guarantees those files exist.
 *
 * Runs automatically before every `vite build` via the npm `prebuild` hook.
 * Idempotent; no-ops when the files are already current.
 */
import { copyFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ortDist = join(repoRoot, "node_modules", "onnxruntime-web", "dist");
const outDir = join(repoRoot, "public", "onnx");

const FILES = [
  // Modern ORT (1.21+) runtime set: threaded SIMD core + WebGPU (jsep) build,
  // each with its ESM loader glue.
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
];

mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const src = join(ortDist, file);
  const dst = join(outDir, file);
  if (!existsSync(src)) {
    console.warn(`[copy-ort-wasm] WARN: ${file} not found in onnxruntime-web dist — skipping`);
    continue;
  }
  let needsCopy = true;
  if (existsSync(dst)) {
    needsCopy = statSync(src).size !== statSync(dst).size;
  }
  if (needsCopy) {
    copyFileSync(src, dst);
    copied++;
    console.log(`[copy-ort-wasm] ${file} (${(statSync(src).size / 1048576).toFixed(1)} MB)`);
  }
}
console.log(`[copy-ort-wasm] done — ${copied} file(s) copied to public/onnx/`);
