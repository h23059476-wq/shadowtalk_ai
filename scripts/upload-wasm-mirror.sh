#!/usr/bin/env bash
# upload-wasm-mirror.sh — wasm-only incremental add to the orphan `weights`
# branch (models already hosted there; fixes the weights/wasm/*.wasm 404s that
# made the mirror retry for the 0.5B twins unusable).
set -euo pipefail

OWNER=h23059476-wq
REPO=shadowtalk_ai
BRANCH=weights
APP_REPO=/home/z/my-project/shadowtalk_ai
WORK=/tmp/weights-wasm
STAMP="$(date -u +%Y%m%d-%H%M%S)"

WASM_BASE="https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base"
WASM_FILES=(
  "Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm"
  "Qwen2-0.5B-Instruct-q4f32_1_cs1k-webgpu.wasm"
)

echo "== 1. Download model_lib WASMs from mlc-ai =="
rm -rf "$WORK"; mkdir -p "$WORK"
for W in "${WASM_FILES[@]}"; do
  echo "  $W"
  curl -fL --retry 3 -sS -o "$WORK/$W" "$WASM_BASE/$W"
done
ls -la "$WORK"

echo "== 2. Build incremental commit on $BRANCH =="
cd "$APP_REPO"
git fetch --quiet origin "$BRANCH"
git checkout --quiet -B "$BRANCH" "origin/$BRANCH"
mkdir -p wasm
cp "$WORK/"* wasm/
git add wasm
if git diff --cached --quiet HEAD; then
  echo "  wasm already present — nothing to commit"
else
  git -c user.name="model-mirror" -c user.email="mirror@localhost" \
    commit -q -m "Mirror model_lib WASMs for the 0.5B twins — $STAMP

Byte-identical copies of mlc-ai/binary-mlc-llm-libs (v0_2_84/base) so a
mirrored model's entire engine init (config + shards + WASM) depends only
on this repo. Fixes: weights/wasm/*.wasm served 404, which made the
mirror retry in LocalInferenceEngine unusable."
  echo "committed on $BRANCH: $(git rev-parse --short HEAD)"
fi

echo "== 3. Push $BRANCH =="
GH_TOKEN="$(sed -E 's|https://x-access-token:([^@]+)@github.com/?|\1|' "$APP_REPO/../.gh-creds")"
git push "https://x-access-token:${GH_TOKEN}@github.com/${OWNER}/${REPO}.git" "$BRANCH" 2>&1 | grep -v -E "^remote:|Receiving|Resolving|Counting|Compressing|Writing|Total" || true

echo "== 4. Restore main =="
git checkout --quiet main
git status -sb | head -2

echo "== 5. Verify raw serving + CORS =="
OK=0
for C in "${WASM_FILES[@]}"; do
  U="https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/wasm/$C"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U")
  CORS=$(curl -sI -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U" | grep -i "access-control-allow-origin" | tr -d "\r")
  echo "  wasm/$C → $CODE | $CORS"
  CORS_OK=$(curl -sI -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U" | grep -i "access-control-allow-origin" | grep -qE ": *\*($|\r)" && echo yes || echo no)
  [ "$CODE" = "200" ] && [ "$CORS_OK" = "yes" ] && OK=$((OK+1))
done
if [ "$OK" = "${#WASM_FILES[@]}" ]; then echo "MIRROR_VERIFIED"; else echo "MIRROR_INCOMPLETE ($OK/${#WASM_FILES[@]})"; exit 1; fi
