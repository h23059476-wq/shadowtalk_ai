#!/usr/bin/env bash
# upload-weights-branch.sh — push WebLLM starter weights to the orphan
# `weights` branch of the APP repo (h23059476-wq/shadowtalk_ai).
#
# Why the orphan branch: the fine-grained PAT covers shadowtalk_ai but cannot
# write the newly created h23059476-wq/shadowtalk-weights repo (403). An
# orphan branch inside the app repo is served identically by
# raw.githubusercontent.com (same CORS, same directory preservation), and
# `main` stays small — normal pulls/clone never download the weights.
#
# Layout (WebLLM cleanModelUrl contract — literal "resolve/main" dirs):
#   models/<ModelName>/resolve/main/<files…>
#
# Resulting mirror template:
#   https://raw.githubusercontent.com/h23059476-wq/shadowtalk_ai/weights/models/{slug}/resolve/main/
set -euo pipefail

OWNER=h23059476-wq
REPO=shadowtalk_ai
BRANCH=weights
APP_REPO=/home/z/my-project/shadowtalk_ai
WORK=/tmp/weights-work
STAMP="$(date -u +%Y%m%d-%H%M%S)"

MODELS=("Qwen2.5-0.5B-Instruct-q4f16_1-MLC" "Qwen2.5-0.5B-Instruct-q4f32_1-MLC")

echo "== 1. Download from HuggingFace =="
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

echo "== 2. Orphan branch $BRANCH in $OWNER/$REPO =="
cd "$APP_REPO"
git checkout --quiet main
git checkout --orphan "$BRANCH"
git rm -rf --quiet . 2>/dev/null || true
mkdir -p models
for M in "${MODELS[@]}"; do
  mkdir -p "models/$M/resolve/main"
  cp "$WORK/hf/$M/"* "models/$M/resolve/main/"
done
git add -A models
git -c user.name="model-mirror" -c user.email="mirror@localhost" \
  commit -q -m "Mirror WebLLM starter weights (Qwen2.5-0.5B twins) — $STAMP

Raw-GitHub mirror fallback for the private-AI background install.
Files are byte-identical to huggingface.co/mlc-ai/<slug>/resolve/main/.
This branch is orphaned on purpose: main never carries the weights."
echo "committed on $BRANCH: $(git rev-parse --short HEAD)"

echo "== 3. Push $BRANCH =="
AUTH_URL="https://x-access-token:${GH_TOKEN}@github.com/${OWNER}/${REPO}.git"
git push "$AUTH_URL" "$BRANCH" 2>&1 | grep -v -E "^remote:|Receiving|Resolving|Counting|Compressing|Writing|Total" || true

echo "== 4. Restore main =="
git checkout --quiet main
git status -sb | head -2

echo "== 5. Verify raw serving + CORS =="
OK=0
for M in "${MODELS[@]}"; do
  U="https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/models/$M/resolve/main/mlc-chat-config.json"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U")
  CORS=$(curl -sI -H "Origin: https://shadowtalk-ai-7a513.web.app" "$U" | grep -i "access-control-allow-origin" | tr -d "\r")
  echo "  $M → $CODE | $CORS"
  [ "$CODE" = "200" ] && [ "${CORS#*: }" = " *" ] && OK=$((OK+1))
done
if [ "$OK" = "${#MODELS[@]}" ]; then echo "MIRROR_VERIFIED"; else echo "MIRROR_INCOMPLETE ($OK/${#MODELS[@]})"; exit 1; fi
