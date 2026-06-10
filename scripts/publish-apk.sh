#!/bin/bash
# 将 APK 发布到本地下载目录并通知服务端
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK_SRC="${1:-$ROOT/server/downloads/tongmeng-ai.apk}"

if [ ! -f "$APK_SRC" ]; then
  echo "❌ APK 不存在: $APK_SRC"
  exit 1
fi

VERSION=$(node -p "require('$ROOT/web/package.json').version")
BUILD=$(date +%Y%m%d%H%M)

mkdir -p "$ROOT/server/downloads"
cp "$APK_SRC" "$ROOT/server/downloads/tongmeng-ai.apk"
echo "{\"version\":\"$VERSION\",\"build\":\"$BUILD\",\"updatedAt\":\"$(date -Iseconds)\"}" > "$ROOT/server/downloads/build-info.json"

echo "✅ APK 已发布到 server/downloads/"
ls -lh "$ROOT/server/downloads/tongmeng-ai.apk"

# 通知运行中的服务端（可选）
if [ -n "$DEPLOY_WEBHOOK_SECRET" ]; then
  curl -sf -X POST "http://localhost:${PORT:-9050}/api/deploy/publish-apk" \
    -H "Content-Type: application/json" \
    -H "x-deploy-secret: $DEPLOY_WEBHOOK_SECRET" \
    -d "{\"version\":\"$VERSION\",\"build\":\"$BUILD\"}" && echo "服务端已刷新"
fi
