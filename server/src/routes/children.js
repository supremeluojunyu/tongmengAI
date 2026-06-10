import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const children = db.prepare('SELECT * FROM children WHERE user_id = ? ORDER BY created_at').all(req.user.id);
  if (req.user.role === 'teacher' || req.user.role === 'org_admin') {
    const classChildren = db.prepare(`
      SELECT c.* FROM children c
      JOIN classes cl ON c.class_id = cl.id
      WHERE cl.teacher_id = ? OR cl.org_id = ?
    `).all(req.user.id, req.user.orgId);
    const merged = [...children];
    for (const c of classChildren) {
      if (!merged.find(m => m.id === c.id)) merged.push(c);
    }
    return res.json(merged);
  }
  res.json(children);
});

router.post('/', authRequired, (req, res) => {
  const { nickname, age, gender, specialNeeds } = req.body;
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO children (id, user_id, nickname, age, gender, special_needs, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, nickname, age, gender, specialNeeds || null, now);
  res.json(db.prepare('SELECT * FROM children WHERE id = ?').get(id));
});

router.put('/:id', authRequired, (req, res) => {
  const { nickname, age, gender, specialNeeds } = req.body;
  db.prepare(
    'UPDATE children SET nickname=?, age=?, gender=?, special_needs=? WHERE id=? AND user_id=?'
  ).run(nickname, age, gender, specialNeeds, req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM children WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM children WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

export default router;
