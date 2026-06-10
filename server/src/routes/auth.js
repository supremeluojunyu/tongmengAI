import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: '请输入手机号和密码' });
  }
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '手机号或密码错误' });
  }
  const { password_hash, ...safe } = user;
  res.json({ token: signToken(user), user: safe });
});

router.post('/register', (req, res) => {
  const { phone, password, name, role = 'parent' } = req.body;
  if (!phone || !password || !name) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (exists) {
    return res.status(400).json({ error: '手机号已注册' });
  }
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO users (id, phone, password_hash, name, role, membership, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, phone, bcrypt.hashSync(password, 10), name, role, 'basic', now);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const { password_hash, ...safe } = user;
  res.json({ token: signToken(user), user: safe });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, phone, name, role, membership, avatar, org_id, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.put('/me', authRequired, (req, res) => {
  const { name, avatar } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?').run(name, avatar, req.user.id);
  const user = db.prepare('SELECT id, phone, name, role, membership, avatar, org_id FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

export default router;
