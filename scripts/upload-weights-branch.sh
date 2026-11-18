#!/usr/bin/env bash
# upload-weights-branch.sh — push WebLLM starter weights + model_lib WASMs to
# the orphan `weights` branch of the APP repo (h23059476-wq/shadowtalk_ai).
#
# Why the orphan branch: the fine-grained PAT covers shadowtalk_ai but cannot
# write the newly created h23059476-wq/shadowtalk-weights repo (403). An
# orphan branch inside the app repo is served identically by
# raw.githubusercontent.com (same CORS, same directory preservation), and
# `main` stays small — normal pulls/clone never download the weights.
#
# Layout (WebLLM cleanModelUrl contract — literal "resolve/main" dirs):
#   models/<ModelName>/resolve/main/<files…>   (weights, mirrored from HF)
#   wasm/<runtime>.wasm                        (model_lib runtimes, mirrored
#                                               from mlc-ai/binary-mlc-llm-libs)
#
# Resulting mirror (src/offline/modelMirror.ts):
#   https://raw.githubusercontent.com/h23059476-wq/shadowtalk_ai/weights/models/{slug}/resolve/main/
#   https://raw.githubusercontent.com/h23059476-wq/shadowtalk_ai/weights/wasm/<filename>
#
# INCREMENTAL by default: when the remote `weights` branch already exists it
# is fetched and the new commit is added ON TOP (models stay untouched — no
# 290MB re-upload). PASS --fresh to rebuild the branch from scratch.
set -euo pipefail

OWNER=h23059476-wq
REPO=shadowtalk_ai
BRANCH=weights
APP_REPO=/home/z/my-project/shadowtalk_ai
WORK=/tmp/weights-work
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FRESH=false
[ "${1:-}" = "--fresh" ] && FRESH=true

MODELS=("Qwen2.5-0.5B-Instruct-q4f16_1-MLC" "Qwen2.5-0.5B-Instruct-q4f32_1-MLC")

# The model_lib WASM runtime each mirrored model needs (must match the
# prebuiltAppConfig of the installed @mlc-ai/web-llm version — v0.2.84 URLs).
# web-llm names the Qwen2.5 files after the Qwen2 runtime it reuses.
WASM_BASE="https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base"
WASM_FILES=(
  "Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm"
  "Qwen2-0.5B-Instruct-q4f32_1_cs1k-webgpu.wasm"
)

echo "== 1. Download weights from HuggingFace =="
rm -rf "$WORK"; mkdir -p "$WORK/hf"
for M in "${MODELS[@]}"; do
  mkdir -p "$WORK/hf/$M"
  curl -fsS "https://huggingface.co/api/models/mlc-ai/$M/tree/main" |
    python3 -c 'import json,sys; [print(f["path"], f["size"]) for f in json.load(sys.stdin)]' |
    while read -r P S; do
      case "$P" in .gitattributes|README.md) continue ;; esac
      if [ "$S" -gt $((100*1024*1024)) ]; then echo "SKIP $P" >&2; continue; fi
      echo "  $M/$P ($((S/1048576)) MB)"
      curl -fL --retry 3 -sS -o "$WORK/hf/$M/$P" "https://huggingface.co/mlc-ai/$M/resolve/main/$P"
    done
done
echo "downloaded: $(du -sh "$WORK/hf" | cut -f1)"

echo "== 2. Download model_lib WASMs from mlc-ai =="
mkdir -p "$WORK/wasm"
for W in "${WASM_FILES[@]}"; do
  echo "  $W"
  curl -fL --retry 3 -sS -o "$WORK/wasm/$W" "$WASM_BASE/$W"
done
echo "downloaded: $(du -sh "$WORK/wasm" | cut -f1)"

echo "== 3. Build $BRANCH in $OWNER/$REPO =="
cd "$APP_REPO"
git fetch --quiet origin "$BRANCH" 2>/dev/null || true
if [ "$FRESH" = true ] || ! git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null; then
  echo "  (orphan — building from scratch)"
  git checkout --quiet main
  git checkout --orphan "$BRANCH"
  git rm -rf --quiet . 2>/dev/null || true
else
  echo "  (incremental — adding to existing remote branch)"
  git checkout --quiet -B "$BRANCH" "origin/$BRANCH"
fi
mkdir -p models wasm
for M in "${MODELS[@]}"; do
  if [ ! -f "models/$M/resolve/main/mlc-chat-config.json" ]; then
    mkdir -p "models/$M/resolve/main"
    cp "$WORK/hf/$M/"* "models/$M/resolve/main/"
  fi
done
cp "$WORK/wasm/"* wasm/
git add -A models wasm
if git diff --cached --quiet HEAD 2>/dev/null; then
  echo "  nothing new to commit — branch already up to date"
else
  git -c user.name="model-mirror" -c user.email="mirror@localhost" \
    commit -q -m "Mirror WebLLM starter weights + model_lib WASMs — $STAMP

Raw-GitHub mirror fallback for the private-AI background install.
Weight files are byte-identical to huggingface.co/mlc-ai/<slug>/resolve/main/;
WASM runtimes are byte-identical to mlc-ai/binary-mlc-llm-libs (v0_2_84/base).
src/offline/modelMirror.ts rewrites both the weights and the WASM URLs of the
mirrored 0.5B twins to this branch, so a mirrored model's entire engine init
depends only on this repo — never on the HuggingFace CDN or the mlc-ai libs
repo. This branch is orphaned on purpose: main never carries the weights."
  echo "committed on $BRANCH: $(git rev-parse --short HEAD)"
fi

echo "== 4. Push $BRANCH =="
AUTH_URL="https://x-access-token:${GH_TOKEN:-$(sed -E 's|https://x-access-token:([^@]+)@github.com/?|\1|' "$APP_REPO/../.gh-creds" 2>/dev/null)}@github.com/${OWNER}/${REPO}.git"
git push "$AUTH_URL" "$BRANCH" 2>&1 | grep -v -E "^remote:|Receiving|Resolving|Counting|Compressing|Writing|Total" || true

echo "== 5. Restore main =="
git checkout --quiet main
git status -sb | head -2

echo "== 6. Verify raw serving + CORS =="
OK=0
CHECKS=(
  "models/${MODELS[0]}/resolve/main/mlc-chat-config.json"
  "models/${MODELS[1]}/resolve/main/mlc-chat-config.json"
  "wasm/${WASM_FILES[0]}"
  "wasm/${WASM_FILES[1]}"
)
for C in "${CHECKS[@]}"; do
  U="https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/$C"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U")
  CORS=$(curl -sI -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U" | grep -i "access-control-allow-origin" | tr -d "\r")
  echo "  $C → $CODE | $CORS"
  [ "$CODE" = "200" ] && [ "${CORS#*: }" = " *" ] && OK=$((OK+1))
done
if [ "$OK" = "${#CHECKS[@]}" ]; then echo "MIRROR_VERIFIED"; else echo "MIRROR_INCOMPLETE ($OK/${#CHECKS[@]})"; exit 1; fi
