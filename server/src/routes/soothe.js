import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/:childId', authRequired, (req, res) => {
  const records = db.prepare(
    'SELECT * FROM soothe_records WHERE child_id = ? ORDER BY started_at DESC LIMIT 20'
  ).all(req.params.childId);
  res.json(records);
});

router.post('/start', authRequired, (req, res) => {
  const {
    childId, triggerType = 'manual', soundType, lightBrightness,
    lightColor, posture, forceLevel, durationMin = 30,
  } = req.body;

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO soothe_records (id, child_id, user_id, trigger_type, sound_type, light_brightness,
     light_color, posture, force_level, duration_min, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, childId, req.user.id, triggerType, soundType, lightBrightness, lightColor, posture, forceLevel, durationMin, now);

  res.json({
    id,
    message: '安抚已启动',
    command: { soundType, lightBrightness, lightColor, posture, forceLevel, durationMin },
  });
});

router.post('/stop', authRequired, (req, res) => {
  const { recordId, effectMinutesSaved = 0 } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE soothe_records SET ended_at = ?, effect_minutes_saved = ? WHERE id = ? AND user_id = ?'
  ).run(now, effectMinutesSaved, recordId, req.user.id);
  res.json({ message: '安抚已停止' });
});

router.post('/exoskeleton', authRequired, (req, res) => {
  const { childId, mode, forceLevel } = req.body;
  const latest = db.prepare(
    'SELECT id FROM monitoring_snapshots WHERE child_id = ? ORDER BY recorded_at DESC LIMIT 1'
  ).get(childId);

  if (latest) {
    db.prepare(
      'UPDATE monitoring_snapshots SET exoskeleton_mode = ?, exoskeleton_force = ? WHERE id = ?'
    ).run(mode, forceLevel, latest.id);
  }

  res.json({ message: '外骨骼指令已下发', mode, forceLevel });
});

export default router;
