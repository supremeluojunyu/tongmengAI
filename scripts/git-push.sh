#!/bin/bash
# 推送到 GitHub（SSH）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${GIT_BRANCH:-main}"

if ! git remote get-url "$REMOTE" &>/dev/null; then
  git remote add "$REMOTE" git@github.com:supremeluojunyu/tongmengAI.git
fi

git remote set-url "$REMOTE" git@github.com:supremeluojunyu/tongmengAI.git

if [ -n "$(git status --porcelain)" ] || [ -z "$(git log -1 2>/dev/null)" ]; then
  git add -A
  git diff --cached --quiet || git commit -m "${1:-chore: auto sync $(date +%Y-%m-%d\ %H:%M)}"
fi

git branch -M "$BRANCH" 2>/dev/null || true
git push -u "$REMOTE" "$BRANCH" "${@:2}"
echo "✅ 已推送到 git@github.com:supremeluojunyu/tongmengAI.git ($BRANCH)"
