# Shadow-1-Whisper-0.8B — Fine-Tuning & Export Kit

Everything needed to produce **`shadowtalkai/Shadow-1-Whisper-0.8B`**, ShadowTalk's own on-device
model, fine-tuned from **`unsloth/Qwen3.5-0.8B`** on a **free Google Colab T4** and exported to:

| Artifact | HF repo | Runtime |
|---|---|---|
| Merged 16-bit weights | `shadowtalkai/Shadow-1-Whisper-0.8B` | canonical base (GGUF + ONNX derive from it) |
| GGUF `q4_k_m` | `shadowtalkai/Shadow-1-Whisper-0.8B-GGUF` | **Tauri Desktop** (llama.cpp) |
| ONNX `q4` (WebGPU) | `shadowtalkai/Shadow-1-Whisper-0.8B-ONNX` | **Browser worker** (`@huggingface/transformers` v4+) |

```
training/shadow-1-whisper/
├── generate_dataset.py          # builds + validates the SFT dataset (run this first, locally)
├── shadowtalk_sft.jsonl         # 620 examples — generated, schema-validated
├── train_and_export_colab.ipynb # the Colab notebook (5 code cells, T4)
└── README.md                    # this runbook
```

The dataset mixture mirrors ShadowTalk's production workloads: **45%** `shadowvisual` engine JSON
(chart / diagram / infographic, validated against the real `visualContract.ts` rules), **25%** agentic
`mission` blocks + tool calling (ProofLoop enums, exact `ToolType` names, and tool-result continuations
in the REAL runtime tool-card formats — assistant-turn cards from `ChatbotPage.tsx` /
`executeShadowTool.ts` / `executeCalculator()`, including the honest "not yet deployed" cards for
`database_query` / `file_manager`), **20%** strict offline RAG (context arrives as the runtime
`[RETRIEVED DOCUMENT CONTEXT …]` system block from `src/lib/rag/format.ts`; answers cite `[S1]`, `[S2]`
or refuse), **10%** sovereign identity + English/Urdu/Roman Urdu.

Two invariants to keep in mind when editing scenarios:

- **Interception guarantee** — every tool-card turn is a *context* turn, not a generation target. The
  notebook's SFT loss covers all assistant turns, so each card-bearing record opens with a request the
  runtime tool detector intercepts before the model is called (`calc`/bare arithmetic, `search the web
  for …`, `/image …`). Only `database_query` / `file_manager` cards are deliberately reachable — their
  honest "not yet deployed" text is what the runtime actually says.
- **Dedup is full-conversation** — records are deduplicated on every message, not the first user turn,
  and pools are deduped *before* sampling: two examples that share an opener but differ in a follow-up
  are both kept.

---

## 0. Prerequisites (one-time, ~10 min)

1. **Hugging Face account** — create or log in at [huggingface.co](https://huggingface.co).
2. **Write token** — Settings → Access Tokens → *New token* → type **Fine-grained**, check
   `Write access to contents/settings of all repos under your namespace`. Keep `hf_…` private.
3. **Google Colab** — any free account; the notebook targets the **T4 GPU** runtime.

## 1. Regenerate the dataset (local, optional but recommended)

```bash
cd training/shadow-1-whisper
python3 generate_dataset.py
# → writes shadowtalk_sft.jsonl (620 lines) and validates EVERY visual/mission payload
#   against the contracts (visualContract.ts + ProofLoop enums). Exit code 0 = clean.
```

Deterministic (`SEED = 20261127`) — re-running reproduces byte-identical output.
If you edit scenarios, the built-in validator re-checks every fenced payload and fails loudly.

## 2. Upload to Colab

1. Open [colab.research.google.com](https://colab.research.google.com) → **Upload notebook**
   → select `train_and_export_colab.ipynb`.
2. Runtime → **Change runtime type** → **T4 GPU** → Save.
3. Upload the dataset next to the notebook — easiest way: run **Cell 3**, which prompts for the
   upload and saves it to the working directory. (Alternatively use the Files sidebar → drag
   `shadowtalk_sft.jsonl` in.)

## 3. Run the notebook (≈ 45-60 min total)

| Cell | What it does | Typical time |
|---|---|---|
| **1 — Setup** | fails fast on CPU runtimes, then installs the **official unsloth Qwen3.5 Vision Colab combo** — pinned `torch 2.8.0`, `transformers==5.2.0`, `trl==0.22.2`, `tokenizers≤0.23.0`, xformers, `unsloth install-kernels` — plus onnx/onnxruntime for the export cells | 3-5 min |
| **2 — Auth & load** | secure `getpass` token, loads `unsloth/Qwen3.5-0.8B` (`load_in_4bit=False` → ~3 GB VRAM), LoRA `r=16, lora_alpha=16` on **language layers only** (vision frozen) | ~2 min |
| **3 — Train** | chat-template SFT, `max_length=2048` (trl 0.22.2 field name), **3 epochs @ lr 2e-4** | 25-40 min |
| **4 — Push merged + GGUF** | merged 16-bit → `shadowtalkai/Shadow-1-Whisper-0.8B`; GGUF `q4_k_m` → `shadowtalkai/Shadow-1-Whisper-0.8B-GGUF` | 10-18 min |
| **5 — ONNX transplant** | transplants fine-tuned language weights + tokenizer onto the reference WebGPU graph from `onnx-community/Qwen3.5-0.8B-ONNX`, verifies with onnxruntime, uploads → `shadowtalkai/Shadow-1-Whisper-0.8B-ONNX` | 8-15 min |

**Checkpoint guidance:** train loss should settle below ~0.9 by epoch 2 and keep drifting down; the
dataset is 45% strict-JSON, so schema-validity — not loss — is the real metric. Spot-check Cell 3's
printed sample to confirm the chat template rendered the `shadowvisual` fence correctly.

**Troubleshooting**

- *Cell 1 version asserts fire* — the environment drifted off the official Qwen3.5 Vision
  pin (`transformers==5.2.0` / `trl==0.22.2`): Runtime → Restart session, re-run Cell 1.
  Never "fix" this by loosening the pin — unsloth's Qwen3.5 kernels are built against that
  exact combo (PyPI's latest transformers is 5.24.x and is NOT tested with them).

- *CUDA OOM in Cell 3* — drop `per_device_train_batch_size` to 1 (gradient_accumulation already
  compensates) or close the Colab "high-RAM" extras. The run is designed for the free T4's 15 GB.
- *T4 rejects bf16* — the notebook auto-selects `fp16` on T4 (bf16 only on Ampere+/L4).
- *Cell 5 coverage assert fires* — the ONNX graph naming drifted vs the reference; the printed
  matched/unmatched report tells you exactly which initializer family to extend in `find_weight()`.
  Shipping a half-transplanted model is never acceptable — the assert exists for that.
- *GGUF step slow* — `q4_k_m` quantization of 0.8B takes ~10 min; if it stalls >30 min, re-run the
  cell (unsloth caches the merged fp16 shard).

## 4. Flip the repos Public

After eyeballing the model cards, make the three repos visible (or keep private and use a token in the
app — for a public product launch they should be public so the model manager can resolve them without
auth):

```
huggingface.co/shadowtalkai/Shadow-1-Whisper-0.8B        → Settings → Change visibility → Public
huggingface.co/shadowtalkai/Shadow-1-Whisper-0.8B-GGUF   → Settings → Change visibility → Public
huggingface.co/shadowtalkai/Shadow-1-Whisper-0.8B-ONNX   → Settings → Change visibility → Public
```

Add the model card (name, base model, dataset mix, license, the eval numbers from the internal suite)
before going public — a bare public repo reads as unfinished.

## 5. Wire the ONNX package into ShadowTalk's WebGPU worker

The web runtime consumes `shadowtalkai/Shadow-1-Whisper-0.8B-ONNX` through
**`@huggingface/transformers` v4+** (`Qwen3_5ForConditionalGeneration` + `AutoProcessor`).
The integration point is the Tier-1 worker (`src/workers/hfInference.worker.ts`): replace the
stand-in model id and match the sampling contract below.

```ts
// src/workers/hfInference.worker.ts (Tier-1 on-device chat)
import {
  AutoProcessor,
  Qwen3_5ForConditionalGeneration,
  TextStreamer,
} from "@huggingface/transformers";

const MODEL_ID = "shadowtalkai/Shadow-1-Whisper-0.8B-ONNX";

// Device ladder stays as-is: WebGPU first, WASM fallback (the worker already
// probes requestAdapter() before choosing a backend).
const processor = await AutoProcessor.from_pretrained(MODEL_ID);
const model = await Qwen3_5ForConditionalGeneration.from_pretrained(MODEL_ID, {
  dtype: "q4",            // quantized weights shipped in the ONNX package
  device: navigator.gpu ? "webgpu" : "wasm",
});

const output = await model.generate({
  ...inputs,                        // from processor(inputs, { add_generation_prompt: true })
  max_new_tokens: 512,
  do_sample: true,
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  presence_penalty: 1.5,
  streamer: new TextStreamer(tokenizer, { skip_prompt: true, callback_function: onToken }),
});
```

Sampling contract — **do not change per-feature**: `temperature: 0.7`, `top_p: 0.8`, `top_k: 20`,
`presence_penalty: 1.5`. These are tuned for schema-exact `shadowvisual` JSON; drifting them is how
models start emitting invalid payloads again.

Also required by the worker (already in place, listed so the wiring is complete):

- `env.backends.onnx.wasm.wasmPaths = "/onnx/"` — ORT runtime is served locally by the app
  (gitignored `public/onnx/`, staged by `scripts/copy-ort-wasm.mjs` via the `predev`/`prebuild` hook);
- model caching goes through the Offline Model Manager (Cache API, resumable downloads);
- the offline prompt never falls back to cloud unless the user explicitly escalates.

**Desktop (Tauri)**: point the llama.cpp loader at
`shadowtalkai/Shadow-1-Whisper-0.8B-GGUF` (`q4_k_m`), same sampling contract, `ctx = 2048`.

## 6. Acceptance checklist

- [ ] `generate_dataset.py` exits 0 (620/620 examples validated)
- [ ] Cell 2 prints trainable-parameter summary (LoRA language layers only)
- [ ] Cell 3 completes 3 epochs; loss < ~0.9
- [ ] All three repos pushed and flipped public
- [ ] ONNX package loads in ORT with the documented input/output shapes (Cell 5 step 5.4)
- [ ] Browser smoke test: download via Offline Model Manager → on-device chat reply renders with the
      "On-device · private" provenance label → `/visual` prompt produces a valid `shadowvisual` block
- [ ] Desktop smoke test: GGUF loads, same sampling contract, chat works offline

## 7. Versioning discipline

- Re-run `generate_dataset.py` after touching **any** prompt/schema/format file it mirrors
  (`visualContract.ts`, `visualSystemPrompt.ts`, `shadowTalkPersona.ts`, `useToolOrchestrator.ts`,
  `proofloop/types.ts`, `rag/format.ts`, `executeShadowTool.ts`, and the tool-card emission sites in
  `ChatbotPage.tsx`) — the enums, limits and runtime string formats are copied, and drift between kit
  and app is a silent-quality killer.
- Ship ONNX versions as `v<N>` tags on the ONNX repo and pin the worker's `MODEL_ID` revision via
  `?revision=v<N>` during canary releases before widening to `main`.
