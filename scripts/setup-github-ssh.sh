#!/bin/bash
# 配置 GitHub SSH 并（可选）通过 Token 自动添加 Deploy Key
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$HOME/.ssh/id_ed25519_github"
PUB="$KEY.pub"

if [ ! -f "$PUB" ]; then
  ssh-keygen -t ed25519 -C "tongmeng-ai@$(hostname)" -f "$KEY" -N ""
fi

chmod 700 "$HOME/.ssh"
chmod 600 "$KEY" "$HOME/.ssh/config" 2>/dev/null || true

# SSH config
if ! grep -q "Host github.com" "$HOME/.ssh/config" 2>/dev/null; then
  cat >> "$HOME/.ssh/config" <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
  chmod 600 "$HOME/.ssh/config"
fi

# 加载 deploy 配置中的 GITHUB_TOKEN
[ -f "$ROOT/deploy.config.env" ] && source "$ROOT/deploy.config.env"

REPO="supremeluojunyu/tongmengAI"
PUBKEY=$(cat "$PUB")

echo "============================================"
echo "  GitHub SSH 公钥（需添加到 GitHub）"
echo "============================================"
echo "$PUBKEY"
echo ""
echo "手动添加: https://github.com/settings/ssh/new"
echo ""

# 通过 Personal Access Token 添加用户 SSH Key
if [ -n "$GITHUB_TOKEN" ]; then
  echo ">>> 使用 GITHUB_TOKEN 添加 SSH Key..."
  TITLE="tongmeng-ai-$(hostname)-$(date +%Y%m%d)"
  HTTP=$(curl -s -o /tmp/gh-key-resp.json -w "%{http_code}" \
    -X POST -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/keys \
    -d "$(jq -n --arg title "$TITLE" --arg key "$PUBKEY" '{title:$title, key:$key}')")
  if [ "$HTTP" = "201" ] || [ "$HTTP" = "422" ]; then
    echo "SSH Key 已添加或已存在 (HTTP $HTTP)"
  else
    echo "用户 Key 添加失败 (HTTP $HTTP)，尝试 Deploy Key..."
    curl -sf -X POST -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/$REPO/keys" \
      -d "$(jq -n --arg title "$TITLE" --arg key "$PUBKEY" '{title:$title, key:$key, read_only:false}')" \
      && echo "Deploy Key 已添加到仓库" || echo "Deploy Key 添加失败，请手动添加公钥"
  fi
fi

echo ""
echo ">>> 测试 GitHub SSH 连接..."
if ssh -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
  echo "✅ GitHub SSH 连接成功"
  cd "$ROOT"
  git remote remove origin 2>/dev/null || true
  git remote add origin git@github.com:${REPO}.git
  git config core.hooksPath .githooks
  chmod +x scripts/git-push.sh .githooks/post-commit
  echo "✅ 远程仓库与自动推送 Hook 已配置"
  echo "   运行: ./scripts/git-push.sh"
else
  echo "⚠️  SSH 尚未授权，请将上方公钥添加到 GitHub 后重新运行:"
  echo "   ./scripts/setup-github-ssh.sh"
fi
