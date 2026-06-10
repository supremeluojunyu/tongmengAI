import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired, requireRoles } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authRequired, requireRoles('teacher', 'org_admin', 'admin'), (req, res) => {
  let classList;
  if (req.user.role === 'teacher') {
    classList = db.prepare('SELECT * FROM classes WHERE teacher_id = ?').all(req.user.id);
  } else {
    classList = db.prepare('SELECT * FROM classes WHERE org_id = ?').all(req.user.orgId);
  }

  const classes = classList.map(cls => {
    const students = db.prepare('SELECT * FROM children WHERE class_id = ?').all(cls.id);
    const studentStatus = students.map(s => {
      const latest = db.prepare(
        'SELECT * FROM monitoring_snapshots WHERE child_id = ? ORDER BY recorded_at DESC LIMIT 1'
      ).get(s.id);
      return { ...s, monitoring: latest };
    });
    return { ...cls, students: studentStatus };
  });

  res.json(classes);
});

router.get('/alerts', authRequired, requireRoles('teacher', 'org_admin', 'admin'), (req, res) => {
  const alerts = db.prepare(
    'SELECT a.*, c.nickname FROM alerts a JOIN children c ON a.child_id = c.id WHERE a.resolved = 0 ORDER BY a.created_at DESC LIMIT 50'
  ).all();
  res.json(alerts);
});

router.post('/alerts/:id/resolve', authRequired, requireRoles('teacher', 'org_admin', 'admin'), (req, res) => {
  db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/batch-soothe', authRequired, requireRoles('teacher', 'org_admin'), (req, res) => {
  const { classId, soundType = 'rain', durationMin = 30 } = req.body;
  const students = db.prepare('SELECT id FROM children WHERE class_id = ?').all(classId);
  const now = new Date().toISOString();
  for (const s of students) {
    db.prepare(
      `INSERT INTO soothe_records (id, child_id, user_id, trigger_type, sound_type, duration_min, started_at)
       VALUES (?, ?, ?, 'batch', ?, ?, ?)`
    ).run(uuid(), s.id, req.user.id, soundType, durationMin, now);
  }
  res.json({ message: `已为${students.length}名幼儿启动批量安抚`, count: students.length });
});

router.post('/share-report', authRequired, requireRoles('teacher', 'org_admin'), (req, res) => {
  const { childIds, period = 'week' } = req.body;
  res.json({
    message: `已向${childIds?.length || 0}位家长发送${period === 'week' ? '周' : '月'}报`,
    sharedAt: new Date().toISOString(),
  });
});

router.get('/classes', authRequired, requireRoles('teacher', 'org_admin', 'admin'), (req, res) => {
  const classes = req.user.role === 'teacher'
    ? db.prepare('SELECT * FROM classes WHERE teacher_id = ?').all(req.user.id)
    : db.prepare('SELECT * FROM classes WHERE org_id = ?').all(req.user.orgId);
  res.json(classes);
});

export default router;
