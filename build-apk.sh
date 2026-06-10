#!/bin/bash
# 童梦AI APK 构建脚本
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/web"

export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
GRADLE_HOME="${GRADLE_HOME:-$HOME/gradle-8.2.1}"
GRADLE_BIN="$GRADLE_HOME/bin/gradle"

echo "🌙 童梦AI APK 构建"
echo "===================="

# 确保 Gradle 可用
ensure_gradle() {
  if [ -x "$GRADLE_BIN" ]; then return 0; fi
  echo "下载 Gradle 8.2.1..."
  GRADLE_ZIP="/tmp/gradle-8.2.1-all.zip"
  for URL in \
    "https://mirrors.cloud.tencent.com/gradle/gradle-8.2.1-all.zip" \
    "https://services.gradle.org/distributions/gradle-8.2.1-all.zip"; do
    curl -fsSL --connect-timeout 60 -o "$GRADLE_ZIP" "$URL" && break
  done
  unzip -qo "$GRADLE_ZIP" -d "$HOME/"
  chmod +x "$GRADLE_BIN"
}

ensure_gradle

echo "1. 构建 Web..."
npm run build

echo "2. 写入构建信息..."
BUILD=$(date +%Y%m%d%H%M)
VERSION=$(node -p "require('./package.json').version")
cat > dist/build-info.json <<EOF
{"version":"$VERSION","build":"$BUILD","updatedAt":"$(date -Iseconds)"}
EOF

echo "3. 同步 Capacitor..."
npx cap sync android

echo "4. 构建 APK..."
cd android
if [ -x ./gradlew ] && ./gradlew --version &>/dev/null; then
  ./gradlew assembleDebug --no-daemon
else
  "$GRADLE_BIN" assembleDebug --no-daemon
fi

APK="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  mkdir -p "$ROOT/server/downloads"
  cp "$APK" "$ROOT/server/downloads/tongmeng-ai.apk"
  cp "$APK" "$ROOT/tongmeng-ai-debug.apk"
  echo "{\"version\":\"$VERSION\",\"build\":\"$BUILD\",\"updatedAt\":\"$(date -Iseconds)\"}" > "$ROOT/server/downloads/build-info.json"
  echo ""
  echo "✅ APK 构建成功!"
  echo "   版本:   v$VERSION ($BUILD)"
  echo "   下载页: http://localhost:9050/download"
  echo "   文件:   server/downloads/tongmeng-ai.apk"
  ls -lh "$ROOT/server/downloads/tongmeng-ai.apk"
else
  echo "❌ APK 构建失败"
  exit 1
fi
