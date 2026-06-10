#!/bin/bash
# 童梦AI 服务器端启动（含 Web 静态文件）
set -e
cd "$(dirname "$0")"

export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-/home/golden/android-sdk}"

if [ ! -d "server/node_modules" ]; then
  echo "安装后端依赖..."
  cd server && npm install && cd ..
fi

if [ ! -d "web/dist" ]; then
  echo "构建前端..."
  cd web && npm install && npm run build && cd ..
fi

echo "🌙 童梦AI 服务启动中..."
echo "  Web 应用:  http://$(hostname -I | awk '{print $1}'):9050/"
echo "  APK 下载:  http://$(hostname -I | awk '{print $1}'):9050/download"
echo "  演示账号: 13800000001 / 123456"
export PORT=9050
cd server && /usr/bin/node src/index.js
