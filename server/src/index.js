import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import childrenRouter from './routes/children.js';
import devicesRouter from './routes/devices.js';
import monitoringRouter from './routes/monitoring.js';
import sootheRouter from './routes/soothe.js';
import articlesRouter from './routes/articles.js';
import institutionRouter from './routes/institution.js';
import adminRouter from './routes/admin.js';
import { registerDownloadRoutes } from './routes/download.js';
import {
  startSimulator,
  stopSimulator,
  isSimulating,
  getSimulatorStatus,
  subscribe,
} from './services/simulator.js';
import { PORTS } from './config.js';
import './db/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = PORTS.SERVER;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  name: '童梦AI API',
  version: '1.0.0',
  port: PORT,
  download: `/download`,
}));

// 监测数据流控制（内部接口）
app.post('/api/simulator/start', (req, res) => {
  const intervalMs = Number(req.body?.intervalMs) || 5000;
  if (isSimulating()) {
    return res.json({ ok: true, message: '监测服务已在运行', ...getSimulatorStatus() });
  }
  startSimulator(intervalMs);
  res.json({ ok: true, message: '监测服务已开启', ...getSimulatorStatus() });
});

app.post('/api/simulator/stop', (_, res) => {
  stopSimulator();
  res.json({ ok: true, message: '监测服务已暂停', ...getSimulatorStatus() });
});

app.get('/api/simulator/status', (_, res) => {
  res.json(getSimulatorStatus());
});

app.use('/api/auth', authRouter);
app.use('/api/children', childrenRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/soothe', sootheRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/institution', institutionRouter);
app.use('/api/admin', adminRouter);

registerDownloadRoutes(app);

app.get('/tongmeng-logo.svg', (_, res) => {
  const logoPath = path.join(__dirname, '../../tongmeng-logo.svg');
  res.type('image/svg+xml');
  res.sendFile(logoPath, err => {
    if (err) res.status(404).end();
  });
});

const webDist = path.join(__dirname, '../../web/dist');
app.use(express.static(webDist));

// SPA fallback（排除 /api、/download、/ws）
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/download') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(webDist, 'index.html'), err => {
    if (err) res.status(404).send('Web 前端未构建，请运行 cd web && npm run build');
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: '童梦AI 实时连接已建立' }));
  subscribe(ws);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`童梦AI 服务运行于 http://0.0.0.0:${PORT}`);
  console.log(`  Web 应用:  http://0.0.0.0:${PORT}/`);
  console.log(`  APK 下载:  http://0.0.0.0:${PORT}/download`);
});
