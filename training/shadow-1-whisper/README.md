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
| **1 — Setup** | fails fast on CPU runtimes, verifies the compiled torchvision ops load (**subprocess nms probe**), then installs the **official unsloth Qwen3.5 Vision Colab combo** as ONE ABI-matched set — pinned `torch 2.8.0`, `transformers==5.2.0`, `trl==0.22.2`, `tokenizers≤0.23.0`, xformers, `unsloth install-kernels` — plus onnx/onnxruntime for the export cells. Re-runs after a restart take ~20 s when the pinned pair is already on disk | 3-6 min (first run) / ~20 s (re-run) |
| **2 — Auth & load** | token from the `HF_TOKEN` env var (headless/CLI runs), a secure `getpass` prompt (interactive), or **tokenless mode** (`HF_TOKEN=skip` / Enter at the prompt); loads `unsloth/Qwen3.5-0.8B` (`load_in_4bit=False` → ~3 GB VRAM), LoRA `r=16, lora_alpha=16` on **language layers only** (vision frozen) | ~2 min |
| **3 — Train** | chat-template SFT, `max_length=2048` (trl 0.22.2 field name), **3 epochs @ lr 2e-4** | 25-40 min |
| **4 — Push merged + GGUF** | merged 16-bit → `shadowtalkai/Shadow-1-Whisper-0.8B`; GGUF `q4_k_m` → `shadowtalkai/Shadow-1-Whisper-0.8B-GGUF`. Any push failure — or a tokenless run — **saves locally** under `/content/` instead (retrieve with `colab download`) | 10-18 min |
| **5 — ONNX transplant** | transplants fine-tuned language weights + tokenizer onto the **pinned** reference WebGPU graph `onnx-community/Qwen3.5-0.8B-ONNX@8fe9dbe3` (name map + orientation rules verified offline: 320/320 initializers, 187 transposed, 18 squeezed; hard gates on missing/non-finite/size-ambiguous initializers), **regenerates `_q4`/`_q4f16` from the transplanted graphs** (the reference's quantized files carry base weights) with a q4-size regression check, runs a **one-token CPU smoke test** per shipped decoder (finite logits required + transplanted-vs-base cosine gate that catches a silent weight scramble), writes a sha256 `manifest.json`, verifies with onnxruntime, uploads → `shadowtalkai/Shadow-1-Whisper-0.8B-ONNX` + auto-creates the next `v<N>` tag | 10-20 min |

**Checkpoint guidance:** train loss should settle below ~0.9 by epoch 2 and keep drifting down; the
dataset is 45% strict-JSON, so schema-validity — not loss — is the real metric. Spot-check Cell 3's
printed sample to confirm the chat template rendered the `shadowvisual` fence correctly.

**Troubleshooting**

- *Cell 1 version asserts fire* — the environment drifted off the official Qwen3.5 Vision
  pin (`transformers==5.2.0` / `trl==0.22.2`): Runtime → Restart session, re-run Cell 1.
  Never "fix" this by loosening the pin — unsloth's Qwen3.5 kernels are built against that
  exact combo (PyPI's latest transformers is 5.24.x and is NOT tested with them).

- *`operator torchvision::nms does not exist` (anywhere)* — torch and torchvision are
  **ABI-paired compiled libraries**: the torchvision `_C.so` only loads when its build
  matches the installed torch build exactly, and torch's extension loader swallows the
  dlopen failure — the first visible symptom is this error, usually inside unsloth's
  import in Cell 2. It means the environment ended up with a **mixed pair** (e.g. PyPI
  torchvision over Colab's own torch build, or a one-sided downgrade). Cell 1 now
  installs torch/torchvision/torchaudio/xformers as **one matched set** in a single joint
  uv resolution and **verifies the compiled ops load in a fresh subprocess before
  proceeding** — so this state is caught at setup time with a clear message, not half an
  hour later. Recovery if you ever see it: **Runtime → Restart session**, re-run Cell 1
  (its restart guard refuses to reinstall into a session that already imported the stack —
  in-place repair is impossible once binaries are loaded).

- *Cell 1 stops with `setup step failed (exit N): …`* — that IS the useful behavior: every
  install command is checked, so the cell dies at the step that actually failed (visible
  right above the message) instead of cascading into a misleading assert minutes later.
  Fix the cause shown (usually a transient network error — re-run the cell) — re-runs skip
  everything already installed.

- *CUDA OOM in Cell 3* — drop `per_device_train_batch_size` to 1 (gradient_accumulation already
  compensates) or close the Colab "high-RAM" extras. The run is designed for the free T4's 15 GB.
- *T4 rejects bf16* — the notebook auto-selects `fp16` on T4 (bf16 only on Ampere+/L4).
- *Cell 5 coverage/shape asserts fire* — the ONNX graph naming drifted vs the reference; the printed
  report tells you exactly which initializer family to extend in `graph_to_hf()`. Expected baseline on
  the pinned reference graph (`@8fe9dbe3`): 320/320 matched, 187 transposed, 18 squeezed, 0 missing.
  Shipping a half-transplanted model is never acceptable — the asserts exist for that.
- *Cell 5 smoke gate fires (cosine vs base < 0.5, or non-finite logits)* — the transplant scrambled
  weights; do not ship. Re-check the printed `transposed/squeezed` numbers against the 187/18 baseline
  and confirm the reference revision still matches `REF_REVISION` before re-running.
- *Cell 5 smoke prints `ok_no_delta`* — transplanted logits are (nearly) identical to base, so the
  fine-tune barely moved the weights: verify Cell 4 actually merged the LoRA adapters
  (`save_method="merged_16bit"`) before shipping.
- *GGUF step slow* — `q4_k_m` quantization of 0.8B takes ~10 min; if it stalls >30 min, re-run the
  cell (unsloth caches the merged fp16 shard).

## 3b. Headless run with the Google Colab CLI (optional)

The notebook is also drivable from a terminal via Google's official
[Colab CLI](https://github.com/googlecolab/google-colab-cli) — useful for agents and CI. The notebook
is CLI-aware: `HF_TOKEN=skip` runs it tokenless (Cells 4/5 save exports locally instead of pushing).

```bash
pip install google-colab-cli

# one-time OAuth: the CLI prints a URL; approve it in any browser and paste the code back
# (ADC via `gcloud auth application-default login` with the colaboratory scope also works)
colab --auth=oauth2 sessions

colab new -s shadow1 --gpu T4
colab upload -s shadow1 training/shadow-1-whisper/shadowtalk_sft.jsonl /content/shadowtalk_sft.jsonl

# run the whole notebook on the T4; writes train_and_export_colab_output.ipynb locally
colab exec -s shadow1 -f training/shadow-1-whisper/train_and_export_colab.ipynb

# tokenless artifact retrieval after a local-save run
colab download -s shadow1 /content/Shadow-1-Whisper-0.8B-merged ./export-merged
colab log -s shadow1 -o run_log.md
colab stop -s shadow1
```

Notes: `colab exec` streams each cell live; the kernel keeps state across invocations (imports and
variables persist, like one Colab session). `HF_TOKEN=<real token> colab exec …` gives a fully
unattended end-to-end run. Interactive getpass prompts only fire when no `HF_TOKEN` env var is set —
piping stdin to `colab exec` answers them with EOF, which the notebook treats as "tokenless".

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
- [ ] ONNX package loads in ORT with the documented input/output shapes (Cell 5 steps 5.6-5.7) and
      `manifest.json` shows every decoder `runtime_smoke` status `ok` with a sane `cosine_vs_base`
- [ ] Worker pins the published ONNX revision (`?revision=v<N>` tag printed by Cell 5) — not floating `main`
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
