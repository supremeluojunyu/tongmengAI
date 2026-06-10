import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const EMOTION_MAP = {
  excited: { label: '兴奋', color: '#ff4d4f' },
  irritable: { label: '烦躁', color: '#fa8c16' },
  calm: { label: '平静', color: '#52c41a' },
  sleepy: { label: '困倦', color: '#1890ff' },
  tense: { label: '紧张', color: '#eb2f96' },
};

const STAGE_MAP = {
  awake: '清醒',
  light: '浅睡',
  deep: '深睡',
  rem: 'REM',
};

router.get('/:childId/current', authRequired, (req, res) => {
  const latest = db.prepare(
    'SELECT * FROM monitoring_snapshots WHERE child_id = ? ORDER BY recorded_at DESC LIMIT 1'
  ).get(req.params.childId);

  if (!latest) {
    return res.json(generateMockSnapshot(req.params.childId));
  }

  const devices = db.prepare('SELECT * FROM devices WHERE child_id = ?').all(req.params.childId);
  res.json({
    ...latest,
    emotionInfo: EMOTION_MAP[latest.emotion] || EMOTION_MAP.calm,
    sleepStageLabel: STAGE_MAP[latest.sleep_stage] || latest.sleep_stage,
    devices,
  });
});

router.get('/:childId/history', authRequired, (req, res) => {
  const { hours = 24 } = req.query;
  const since = new Date(Date.now() - Number(hours) * 3600000).toISOString();
  const rows = db.prepare(
    'SELECT * FROM monitoring_snapshots WHERE child_id = ? AND recorded_at >= ? ORDER BY recorded_at ASC'
  ).all(req.params.childId, since);
  res.json(rows.map(r => ({
    ...r,
    emotionInfo: EMOTION_MAP[r.emotion],
    sleepStageLabel: STAGE_MAP[r.sleep_stage],
  })));
});

router.get('/:childId/report', authRequired, (req, res) => {
  const { period = 'day' } = req.query;
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 1;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const snapshots = db.prepare(
    'SELECT * FROM monitoring_snapshots WHERE child_id = ? AND recorded_at >= ? ORDER BY recorded_at ASC'
  ).all(req.params.childId, since);

  const sootheRecords = db.prepare(
    'SELECT * FROM soothe_records WHERE child_id = ? AND started_at >= ? ORDER BY started_at DESC'
  ).all(req.params.childId, since);

  const sleepHours = snapshots.filter(s => ['light', 'deep', 'rem'].includes(s.sleep_stage)).length;
  const deepHours = snapshots.filter(s => s.sleep_stage === 'deep').length;
  const awakeCount = snapshots.filter(s => s.sleep_stage === 'awake').length;
  const avgHeartRate = snapshots.length ? Math.round(snapshots.reduce((a, s) => a + s.heart_rate, 0) / snapshots.length) : 0;

  const emotionHeatmap = Array.from({ length: 24 }, (_, h) => {
    const hourData = snapshots.filter(s => new Date(s.recorded_at).getHours() === h);
    const dominant = hourData.length
      ? hourData.sort((a, b) => hourData.filter(x => x.emotion === b.emotion).length - hourData.filter(x => x.emotion === a.emotion).length)[0]?.emotion
      : 'calm';
    return { hour: h, emotion: dominant, count: hourData.length };
  });

  const suggestions = [];
  if (deepHours / Math.max(sleepHours, 1) < 0.25) {
    suggestions.push('本周深睡比例偏低，建议增加睡前按摩与固定睡前仪式');
  }
  if (avgHeartRate > 100) {
    suggestions.push('平均心率偏高，建议检查是否存在夜惊或环境干扰');
  }
  if (sootheRecords.length < 2) {
    suggestions.push('可尝试在入睡前15分钟开启白噪音预设');
  }

  res.json({
    period,
    summary: {
      totalSleepHours: (sleepHours * 0.5).toFixed(1),
      deepSleepRatio: sleepHours ? Math.round((deepHours / sleepHours) * 100) : 0,
      nightWakeCount: Math.floor(awakeCount / 3),
      avgHeartRate,
      sootheCount: sootheRecords.length,
    },
    trend: snapshots.map(s => ({
      time: s.recorded_at,
      heartRate: s.heart_rate,
      breathRate: s.breath_rate,
      sleepStage: s.sleep_stage,
      emotion: s.emotion,
    })),
    emotionHeatmap,
    sootheRecords,
    suggestions,
  });
});

function generateMockSnapshot(childId) {
  const emotions = ['calm', 'sleepy', 'excited', 'irritable'];
  const emotion = emotions[Math.floor(Math.random() * emotions.length)];
  return {
    child_id: childId,
    emotion,
    sleep_stage: 'light',
    heart_rate: 75 + Math.floor(Math.random() * 20),
    breath_rate: 18 + Math.floor(Math.random() * 4),
    body_movement: Math.floor(Math.random() * 3),
    exoskeleton_mode: 'horizontal',
    exoskeleton_force: 'standard',
    exoskeleton_battery: 78,
    recorded_at: new Date().toISOString(),
    emotionInfo: EMOTION_MAP[emotion],
    sleepStageLabel: '浅睡',
    devices: [],
  };
}

export default router;
