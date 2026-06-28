import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_VERSION, APP_BUILD } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS_DIR = path.join(__dirname, '../../downloads');
const BUILD_INFO_FILE = path.join(DOWNLOADS_DIR, 'build-info.json');

const APK_CANDIDATES = [
  path.join(DOWNLOADS_DIR, 'tongmeng-ai.apk'),
  path.join(DOWNLOADS_DIR, 'tongmeng-ai-debug.apk'),
  path.join(__dirname, '../../../tongmeng-ai-debug.apk'),
  path.join(__dirname, '../../../web/android/app/build/outputs/apk/debug/app-debug.apk'),
];

function findApk() {
  for (const p of APK_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readBuildInfo() {
  try {
    if (fs.existsSync(BUILD_INFO_FILE)) {
      return JSON.parse(fs.readFileSync(BUILD_INFO_FILE, 'utf8'));
    }
  } catch { /* ignore */ }
  return { version: APP_VERSION, build: APP_BUILD };
}

function getApkMeta() {
  const apkPath = findApk();
  const buildInfo = readBuildInfo();
  if (!apkPath) {
    return { available: false, ...buildInfo, message: 'APK 尚未构建' };
  }
  const stat = fs.statSync(apkPath);
  return {
    available: true,
    version: buildInfo.version || APP_VERSION,
    build: buildInfo.build || APP_BUILD,
    fileName: 'tongmeng-ai.apk',
    size: stat.size,
    sizeText: formatSize(stat.size),
    updatedAt: buildInfo.updatedAt || stat.mtime.toISOString(),
    downloadUrl: '/download/apk',
  };
}

export function registerDownloadRoutes(app) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

  app.get('/api/download/info', (_, res) => {
    res.json(getApkMeta());
  });

  app.get('/api/update/check', (req, res) => {
    const clientBuild = req.query.build || '';
    const meta = getApkMeta();
    res.json({
      ...meta,
      hasUpdate: meta.available && meta.build !== clientBuild,
    });
  });

  // CI/CD 推送 APK 到服务器（需配置 DEPLOY_WEBHOOK_SECRET）
  app.post('/api/deploy/publish-apk', expressJsonRaw(), (req, res) => {
    const secret = process.env.DEPLOY_WEBHOOK_SECRET;
    if (!secret || req.headers['x-deploy-secret'] !== secret) {
      return res.status(403).json({ error: '无效的部署密钥' });
    }
    // APK 由 CI 通过 rsync/scp 上传至 downloads 目录，此处仅刷新元信息
    const { version, build } = req.body || {};
    if (version && build) {
      fs.writeFileSync(BUILD_INFO_FILE, JSON.stringify({
        version, build, updatedAt: new Date().toISOString(),
      }));
    }
    res.json({ ok: true, meta: getApkMeta() });
  });

  app.get('/download/apk', (req, res) => {
    const apkPath = findApk();
    if (!apkPath) {
      return res.status(404).json({ error: 'APK 文件不存在，请联系管理员构建' });
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="tongmeng-ai.apk"');
    fs.createReadStream(apkPath).pipe(res);
  });

  app.get('/download', (_, res) => {
    const meta = getApkMeta();
    const info = meta.available
      ? { available: true, sizeText: meta.sizeText, updatedAt: new Date(meta.updatedAt).toLocaleString('zh-CN'), version: meta.version, build: meta.build }
      : { available: false, sizeText: '-', updatedAt: '-', version: meta.version, build: meta.build };

    res.type('html').send(renderDownloadPage(info));
  });
}

function expressJsonRaw() {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') return next();
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { req.body = data ? JSON.parse(data) : {}; } catch { req.body = {}; }
      next();
    });
  };
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function renderDownloadPage(info) {
  const downloadBtn = info.available
    ? `<a class="btn btn-primary" href="/download/apk">📥 下载 Android APK (v${info.version})</a>`
    : `<span class="btn btn-disabled">APK 构建中，请稍后再试</span>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>童梦AI - APP 下载</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #e8f4fc 0%, #fce4ec 50%, #faf8f5 100%);
      color: #2c3e50; display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .card {
      max-width: 420px; width: 100%; background: rgba(255,255,255,0.95);
      border-radius: 24px; padding: 40px 32px;
      box-shadow: 0 8px 40px rgba(126,184,218,0.25); text-align: center;
    }
    .logo { width: 100px; height: 100px; margin: 0 auto; animation: breathe 3s ease-in-out infinite; }
    .logo img { width: 100%; height: 100%; display: block; }
    @keyframes breathe { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.06); opacity: 1; } }
    h1 { font-size: 28px; font-weight: 300; color: #5a9bc4; margin: 16px 0 8px; letter-spacing: 4px; }
    .subtitle { color: #999; font-size: 14px; margin-bottom: 32px; }
    .info { background: #f8fbfd; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .info-row span:first-child { color: #999; }
    .btn { display: block; width: 100%; padding: 16px; border-radius: 28px; font-size: 17px; font-weight: 500; text-decoration: none; }
    .btn-primary { background: linear-gradient(135deg, #7eb8da, #a8d8ea); color: #fff; box-shadow: 0 4px 16px rgba(126,184,218,0.4); }
    .btn-disabled { background: #eee; color: #999; }
    .tips { margin-top: 24px; font-size: 12px; color: #aaa; line-height: 1.8; text-align: left; }
    .web-link { display: inline-block; margin-top: 16px; color: #7eb8da; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><img src="/tongmeng-logo.svg" alt="童梦AI" /></div>
    <h1>童梦AI</h1>
    <p class="subtitle">儿童无感监测 · 智能助眠安抚</p>
    <div class="info">
      <div class="info-row"><span>版本</span><span>v${info.version}</span></div>
      <div class="info-row"><span>构建号</span><span>${info.build}</span></div>
      <div class="info-row"><span>安装包大小</span><span>${info.sizeText}</span></div>
      <div class="info-row"><span>更新时间</span><span>${info.updatedAt}</span></div>
      <div class="info-row"><span>系统要求</span><span>Android 10+</span></div>
    </div>
    ${downloadBtn}
    <a class="web-link" href="/">🌐 使用 Web 版</a>
    <div class="tips">
      <strong>安装说明：</strong><br>
      1. 下载 APK 后点击安装<br>
      2. 若提示未知来源，请在设置中允许安装<br>
      3. 首次使用请用手机号注册/登录
    </div>
  </div>
</body>
</html>`;
}
