#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🌙 童梦AI 启动脚本"
echo "===================="

if ! command -v npm &>/dev/null; then
  echo "正在安装 npm..."
  sudo apt-get update -qq && sudo apt-get install -y -qq npm
fi

if [ ! -d "server/node_modules" ]; then
  echo "安装后端依赖..."
  cd server && npm install && cd ..
fi

if [ ! -d "web/node_modules" ]; then
  echo "安装前端依赖..."
  cd web && npm install && cd ..
fi

echo ""
echo "启动服务..."
echo "  主服务:  http://localhost:9050  (API + Web + APK下载)"
echo "  开发前端: http://localhost:9051  (Vite 热更新)"
echo "  APK下载:  http://localhost:9050/download"
echo ""
echo "演示账号:"
echo "  家长: 13800000001 / 123456"
echo "  教师: 13800000002 / 123456"
echo "  管理员: 13800000000 / admin123"
echo ""

trap 'kill 0' EXIT
(export PORT=9050; cd server && /usr/bin/node --watch src/index.js 2>/dev/null || /usr/bin/node src/index.js) &
(cd web && npm run dev) &
wait
