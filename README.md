# 童梦AI · 儿童无感监测智能助眠安抚系统

面向 0-6 岁普通儿童及特殊需要儿童的智能助眠与照护系统 MVP。

## 功能概览

| 模块 | 功能 |
|------|------|
| 实时监测 | 情绪仪表、心率/呼吸、睡眠阶段、WebSocket 推送 |
| 安抚控制 | 音效库、灯光、外骨骼姿势/力度、定时关闭 |
| 数据报告 | 日/周/月趋势、情绪热力图、个性化建议 |
| 育儿知识 | 分龄文章、分类搜索、视频课程 |
| 机构看板 | 班级网格、异常报警、批量安抚、周报分享 |
| 管理后台 | 用户/设备/内容管理、数据统计 |

## 快速启动

```bash
chmod +x start.sh
./start.sh
```

或手动启动：

```bash
cd server && npm install && PORT=9050 npm run dev   # 主服务 9050
cd web && npm install && npm run dev               # 开发前端 9051
```

## 端口说明

| 端口 | 用途 |
|------|------|
| **9050** | 主服务（API + Web + APK 下载页） |
| **9051** | 开发前端（Vite 热更新，代理到 9050） |

## APK 下载页

构建 APK 后，访问：

```
http://你的服务器IP:9050/download
```

直接下载链接：`http://你的服务器IP:9050/download/apk`

## 演示账号

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 家长 | 13800000001 | 123456 |
| 教师 | 13800000002 | 123456 |
| 园长 | 13800000003 | 123456 |
| 管理员 | 13800000000 | admin123 |

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Ant Design + Recharts
- **后端**: Node.js + Express + SQLite + WebSocket
- **移动端**: Capacitor（Android APK）

## 构建 Android APK

```bash
chmod +x build-apk.sh && ./build-apk.sh
# 输出: server/downloads/tongmeng-ai.apk
# 下载页: http://服务器IP:9050/download
```

## 自动部署

### 本地推送到服务器

```bash
cp deploy.config.example.env deploy.config.env
# 编辑 deploy.config.env 填写服务器信息
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

### GitHub Actions 自动构建与推送

推送到 `main` 分支后自动：
1. 构建 APK + Web
2. 上传 Artifact（保留 30 天）
3. 打 `v*` 标签时创建 GitHub Release 并附上 APK
4. 配置 Secrets 后自动 SSH 部署到服务器

**GitHub Secrets 配置**（Settings → Secrets and variables → Actions）：

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 服务器 IP/域名 |
| `DEPLOY_USER` | SSH 用户名 |
| `DEPLOY_SSH_KEY` | SSH 私钥全文 |
| `DEPLOY_PATH` | 部署目录，如 `/opt/tongmeng-ai` |
| `DEPLOY_WEBHOOK_SECRET` | 部署密钥（与服务器环境变量一致） |
| `SERVER_PORT` | 9050（可选） |

**服务器环境变量**：

```bash
export PORT=9050
export DEPLOY_WEBHOOK_SECRET=your-secret
```

**推送代码到 GitHub**：

```bash
git init && git add . && git commit -m "init: 童梦AI"
git remote add origin https://github.com/你的用户名/tongmeng-ai.git
git push -u origin main
```

打标签发布正式版：

```bash
git tag v1.0.0 && git push origin v1.0.0
```

## 注意事项

- 后端需使用 **Node 18**（`/usr/bin/node`），因 better-sqlite3 原生模块与 Node 版本绑定
- 生产部署：`npm run build` 后运行 `./start-server.sh`，访问 **9050** 端口

## 项目结构

```
tongmeng-ai/
├── server/          # 后端 API + WebSocket + 设备模拟器
├── web/             # React 前端（用户端 + 管理后台）
├── start.sh         # 一键启动脚本
└── README.md
```

## API 端点

- `GET /api/health` - 健康检查
- `POST /api/auth/login` - 登录
- `GET /api/monitoring/:childId/current` - 实时监测
- `WS /ws` - 实时数据推送

## 合规说明

上线前需完成《儿童个人信息网络保护规定》合规审查及应用商店隐私政策审核。
