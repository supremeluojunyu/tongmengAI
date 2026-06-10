import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const devices = db.prepare('SELECT * FROM devices WHERE user_id = ?').all(req.user.id);
  res.json(devices);
});

router.post('/bind', authRequired, (req, res) => {
  const { name, type, macAddress, childId } = req.body;
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO devices (id, user_id, child_id, name, type, mac_address, battery, status, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, childId, name, type, macAddress, 100, 'online', now, now);
  res.json(db.prepare('SELECT * FROM devices WHERE id = ?').get(id));
});

router.put('/:id', authRequired, (req, res) => {
  const { childId, status, battery } = req.body;
  db.prepare(
    'UPDATE devices SET child_id=COALESCE(?, child_id), status=COALESCE(?, status), battery=COALESCE(?, battery), last_seen=? WHERE id=? AND user_id=?'
  ).run(childId, status, battery, new Date().toISOString(), req.params.id, req.user.id);
  res.json(db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id));
});

export default router;
