import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/index.js';
import { authRequired } from '../middleware/auth.js';
import { isSimulating } from '../services/simulator.js';

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

/** 基于儿童 ID 的确定性种子 */
function childSeed(childId) {
  const last = childId.slice(-1);
  return last.charCodeAt(0);
}

function hrBaseline(childId) {
  return (childSeed(childId) % 15) + 80;
}

function detRand(seed, i) {
  const x = Math.sin(seed * 9999 + i * 12345) * 10000;
  return x - Math.floor(x);
}

function pickSleepStage(hour, seed, i) {
  const r = detRand(seed + 7, i);
  if (hour >= 2 && hour < 6) {
    if (r < 0.5) return 'deep';
    if (r < 0.8) return 'light';
    return 'rem';
  }
  if (hour >= 13 && hour < 16) {
    if (r < 0.45) return 'light';
    if (r < 0.7) return 'rem';
    return 'awake';
  }
  if (hour >= 21 || hour < 7) {
    if (r < 0.35) return 'light';
    if (r < 0.6) return 'deep';
    if (r < 0.85) return 'rem';
    return 'awake';
  }
  return 'awake';
}

function pickEmotion(hour, seed, i) {
  const r = detRand(seed + 13, i);
  if (hour >= 20 || hour < 6) {
    if (r < 0.55) return 'sleepy';
    if (r < 0.8) return 'calm';
    return 'tense';
  }
  if (hour >= 17 && hour < 20) {
    if (r < 0.55) return 'calm';
    if (r < 0.75) return 'sleepy';
    return 'excited';
  }
  if (hour >= 8 && hour < 17) {
    if (r < 0.45) return 'excited';
    if (r < 0.7) return 'calm';
    if (r < 0.85) return 'irritable';
    return 'sleepy';
  }
  return r < 0.5 ? 'calm' : 'sleepy';
}

/** 数据不足时生成平滑、连续的历史预填充数据 */
function generatePrefillSnapshots(childId, days) {
  const seed = childSeed(childId);
  const baseline = hrBaseline(childId);
  const intervalMin = days === 1 ? 30 : 60;
  const intervalMs = intervalMin * 60 * 1000;
  const totalMs = days * 86400000;
  const count = Math.max(48, Math.floor(totalMs / intervalMs));
  const startTime = Date.now() - totalMs;

  const snapshots = [];
  let prevHr = baseline;
  let prevBr = 20;

  for (let i = 0; i < count; i++) {
    const t = startTime + i * intervalMs;
    const date = new Date(t);
    const hour = date.getHours();
    const hourFrac = hour + date.getMinutes() / 60;

    const hourRad = (hourFrac / 24) * 2 * Math.PI;
    const phase = (seed % 10) * 0.15;
    let targetHr = baseline
      + Math.sin(hourRad + phase) * 7
      + Math.sin(hourRad * 2 + phase * 0.5) * 2.5;
    if (hour >= 22 || hour < 6) targetHr -= 3;
    if (hour >= 14 && hour < 17) targetHr += 2;

    let hr = Math.round(prevHr * 0.75 + targetHr * 0.25);
    hr = Math.max(75, Math.min(110, hr));
    prevHr = hr;

    let targetBr = 20 + (hr - baseline) * 0.12 + Math.sin(hourRad + 1) * 1.5;
    let br = Math.round(prevBr * 0.65 + targetBr * 0.35);
    br = Math.max(16, Math.min(28, br));
    prevBr = br;

    snapshots.push({
      child_id: childId,
      heart_rate: hr,
      breath_rate: br,
      sleep_stage: pickSleepStage(hour, seed, i),
      emotion: pickEmotion(hour, seed, i),
      recorded_at: date.toISOString(),
    });
  }
  return snapshots;
}

function dominantEmotion(hourData) {
  if (!hourData.length) return 'calm';
  const counts = {};
  for (const s of hourData) {
    counts[s.emotion] = (counts[s.emotion] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function minSnapshotsForPeriod(days) {
  if (days === 1) return 48;
  if (days === 7) return 7 * 16;
  return 30 * 8;
}

/** 监测开启时：历史段用预填充，近期用实时数据衔接 */
function buildSnapshotsForReport(childId, days, realSnapshots) {
  const minCount = minSnapshotsForPeriod(days);
  if (realSnapshots.length >= minCount) return realSnapshots;

  const prefill = generatePrefillSnapshots(childId, days);
  if (!realSnapshots.length) return prefill;

  const sessionStart = realSnapshots[0].recorded_at;
  const historical = prefill.filter(s => s.recorded_at < sessionStart);
  return [...historical, ...realSnapshots];
}

function buildEmptyReport(period, sootheRecords) {
  return {
    period,
    summary: {
      totalSleepHours: '0.0',
      deepSleepRatio: 0,
      nightWakeCount: 0,
      avgHeartRate: 0,
      sootheCount: sootheRecords.length,
    },
    trend: [],
    emotionHeatmap: Array.from({ length: 24 }, (_, h) => ({ hour: h, emotion: 'calm', count: 0 })),
    sootheRecords,
    suggestions: ['暂未采集到监测数据，请确认设备已连接'],
  };
}

function buildReportFromSnapshots(snapshots, period, sootheRecords, days) {
  const intervalHours = days === 1 ? 0.5 : 1;
  const sleepHours = snapshots.filter(s => ['light', 'deep', 'rem'].includes(s.sleep_stage)).length;
  const deepHours = snapshots.filter(s => s.sleep_stage === 'deep').length;
  const awakeCount = snapshots.filter(s => s.sleep_stage === 'awake').length;
  const avgHeartRate = snapshots.length
    ? Math.round(snapshots.reduce((a, s) => a + s.heart_rate, 0) / snapshots.length)
    : 0;

  const emotionHeatmap = Array.from({ length: 24 }, (_, h) => {
    const hourData = snapshots.filter(s => new Date(s.recorded_at).getHours() === h);
    return { hour: h, emotion: dominantEmotion(hourData), count: hourData.length };
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
  if (!suggestions.length) {
    suggestions.push('宝宝整体状态良好，继续保持规律作息');
  }

  return {
    period,
    summary: {
      totalSleepHours: (sleepHours * intervalHours).toFixed(1),
      deepSleepRatio: sleepHours ? Math.round((deepHours / sleepHours) * 100) : 0,
      nightWakeCount: Math.max(0, Math.floor(awakeCount / (days === 1 ? 3 : days === 7 ? 5 : 8))),
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
  };
}

router.get('/:childId/current', authRequired, (req, res) => {
  if (!isSimulating()) {
    return res.json(null);
  }

  const latest = db.prepare(
    'SELECT * FROM monitoring_snapshots WHERE child_id = ? ORDER BY recorded_at DESC LIMIT 1'
  ).get(req.params.childId);

  if (!latest) {
    return res.json(null);
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

  const sootheRecords = db.prepare(
    'SELECT * FROM soothe_records WHERE child_id = ? AND started_at >= ? ORDER BY started_at DESC'
  ).all(req.params.childId, since);

  if (!isSimulating()) {
    return res.json(buildEmptyReport(period, sootheRecords));
  }

  const realSnapshots = db.prepare(
    'SELECT * FROM monitoring_snapshots WHERE child_id = ? AND recorded_at >= ? ORDER BY recorded_at ASC'
  ).all(req.params.childId, since);

  const snapshots = buildSnapshotsForReport(req.params.childId, days, realSnapshots);
  res.json(buildReportFromSnapshots(snapshots, period, sootheRecords, days));
});

export default router;
