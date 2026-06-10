#!/bin/bash
# 自动部署：推送代码 + Web + APK 到远程服务器
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 加载配置 deploy.config.env（不提交到 git）
if [ -f "$ROOT/deploy.config.env" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/deploy.config.env"
fi

: "${DEPLOY_HOST:?请设置 DEPLOY_HOST（在 deploy.config.env 中）}"
: "${DEPLOY_USER:?请设置 DEPLOY_USER}"
: "${DEPLOY_PATH:?请设置 DEPLOY_PATH，如 /opt/tongmeng-ai}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
SSH_OPTS="-o StrictHostKeyChecking=no -p $DEPLOY_PORT"
[ -n "$DEPLOY_SSH_KEY" ] && SSH_OPTS="$SSH_OPTS -i $DEPLOY_SSH_KEY"
RSYNC_SSH="ssh $SSH_OPTS"

echo "🚀 部署童梦AI → ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

# 1. 构建 Web
echo ">>> 构建 Web..."
cd "$ROOT/web" && npm run build

# 2. 构建 APK（可选，SKIP_APK=1 跳过）
if [ "${SKIP_APK}" != "1" ] && [ -f "$ROOT/build-apk.sh" ]; then
  echo ">>> 构建 APK..."
  cd "$ROOT" && ./build-apk.sh
fi

# 3. 同步文件到服务器
echo ">>> 同步文件..."
rsync -avz --delete -e "$RSYNC_SSH" \
  --exclude node_modules \
  --exclude server/data \
  --exclude .git \
  --exclude web/android/.gradle \
  --exclude web/android/app/build \
  "$ROOT/server/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/server/"

rsync -avz --delete -e "$RSYNC_SSH" \
  "$ROOT/web/dist/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/web/dist/"

if [ -f "$ROOT/server/downloads/tongmeng-ai.apk" ]; then
  rsync -avz -e "$RSYNC_SSH" \
    "$ROOT/server/downloads/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/server/downloads/"
fi

# 4. 远程安装依赖并重启
echo ">>> 远程重启服务..."
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<REMOTE
set -e
cd ${DEPLOY_PATH}/server
npm install --production 2>/dev/null || npm install
export PORT=${SERVER_PORT:-9050}
pkill -f "${DEPLOY_PATH}/server/src/index.js" 2>/dev/null || true
sleep 1
nohup /usr/bin/node src/index.js > /tmp/tongmeng-ai.log 2>&1 &
echo "服务已启动 PORT=\$PORT"
REMOTE

# 5. 通知 webhook
if [ -n "$DEPLOY_WEBHOOK_SECRET" ]; then
  VERSION=$(node -p "require('$ROOT/web/package.json').version")
  BUILD=$(cat "$ROOT/server/downloads/build-info.json" 2>/dev/null | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).build" 2>/dev/null || date +%Y%m%d%H%M)
  curl -sf -X POST "http://${DEPLOY_HOST}:${SERVER_PORT:-9050}/api/deploy/publish-apk" \
    -H "Content-Type: application/json" \
    -H "x-deploy-secret: $DEPLOY_WEBHOOK_SECRET" \
    -d "{\"version\":\"$VERSION\",\"build\":\"$BUILD\"}" || true
fi

echo ""
echo "✅ 部署完成!"
echo "   Web:  http://${DEPLOY_HOST}:${SERVER_PORT:-9050}/"
echo "   下载: http://${DEPLOY_HOST}:${SERVER_PORT:-9050}/download"
