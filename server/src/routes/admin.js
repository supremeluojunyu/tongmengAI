import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired, requireRoles } from '../middleware/auth.js';

const router = Router();

router.use(authRequired, requireRoles('admin'));

router.get('/stats', (req, res) => {
  res.json({
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    children: db.prepare('SELECT COUNT(*) as c FROM children').get().c,
    devices: db.prepare('SELECT COUNT(*) as c FROM devices').get().c,
    articles: db.prepare('SELECT COUNT(*) as c FROM articles').get().c,
    alerts: db.prepare('SELECT COUNT(*) as c FROM alerts WHERE resolved = 0').get().c,
  });
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, phone, name, role, membership, org_id, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.get('/devices', (req, res) => {
  res.json(db.prepare('SELECT d.*, c.nickname as child_name, u.name as user_name FROM devices d LEFT JOIN children c ON d.child_id=c.id LEFT JOIN users u ON d.user_id=u.id').all());
});

router.get('/articles', (req, res) => {
  res.json(db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all());
});

router.post('/articles', (req, res) => {
  const { title, category, ageGroup, specialType, content, isPremium, videoUrl } = req.body;
  const id = uuid();
  db.prepare(
    'INSERT INTO articles (id, title, category, age_group, special_type, content, video_url, is_premium, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, title, category, ageGroup, specialType, content, videoUrl, isPremium ? 1 : 0, new Date().toISOString());
  res.json(db.prepare('SELECT * FROM articles WHERE id = ?').get(id));
});

router.delete('/articles/:id', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/alerts', (req, res) => {
  res.json(db.prepare('SELECT a.*, c.nickname FROM alerts a JOIN children c ON a.child_id=c.id ORDER BY a.created_at DESC LIMIT 100').all());
});

export default router;
