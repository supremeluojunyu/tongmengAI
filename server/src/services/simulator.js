import db from '../db/index.js';
import { v4 as uuid } from 'uuid';

const SLEEP_CYCLE = ['awake', 'light', 'deep', 'light', 'rem', 'light'];
const MODES = ['horizontal', 'vertical', 'static'];
const FORCES = ['gentle', 'standard', 'strong'];

/** @type {Map<string, object>} 每个儿童独立生理档案 */
const profiles = new Map();

let intervalId = null;
let simulating = false;
let tickCount = 0;
let startedAt = null;
let currentIntervalMs = 5000;

const subscribers = new Set();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createProfile() {
  return {
    hrBaseline: rand(85, 100),
    breathBaseline: rand(18, 24),
    movementBaseline: rand(0.5, 2),
    hrPhase: rand(0, Math.PI * 2),
    breathPhase: rand(0, Math.PI * 2),
    movementPhase: rand(0, Math.PI * 2),
    emotionPhase: rand(0, Math.PI * 2),
    emotionDrift: rand(0.002, 0.008),
    emotion: Math.random() < 0.5 ? 'calm' : 'sleepy',
    emotionStability: rand(0.85, 0.95),
    sleepStageIndex: 0,
    sleepStageProgress: 0,
    sleepStageDuration: 8 + Math.floor(rand(0, 6)),
    exoskeletonMode: MODES[0],
    exoskeletonForce: FORCES[1],
    exoskeletonBattery: Math.round(rand(60, 95)),
  };
}

function getProfile(childId) {
  if (!profiles.has(childId)) {
    profiles.set(childId, createProfile());
  }
  return profiles.get(childId);
}

/** 三正弦波叠加 + 微小随机扰动 */
function generateVitals(p) {
  p.hrPhase += 0.03 + rand(-0.005, 0.005);
  p.breathPhase += 0.05 + rand(-0.008, 0.008);
  p.movementPhase += 0.04 + rand(-0.006, 0.006);

  const heartRate = p.hrBaseline
    + Math.sin(p.hrPhase) * 6
    + Math.sin(p.hrPhase * 2.3) * 2.4
    + Math.sin(p.hrPhase * 0.7) * 3.6
    + rand(-1.5, 1.5);

  const breathRate = p.breathBaseline
    + Math.sin(p.breathPhase) * 2.5
    + Math.sin(p.breathPhase * 2.3) * 1
    + Math.sin(p.breathPhase * 0.7) * 1.5
    + rand(-0.8, 0.8);

  const bodyMovement = Math.max(
    0,
    p.movementBaseline + Math.sin(p.movementPhase) * 1.2 + rand(-0.5, 0.5)
  );

  return {
    heartRate: Math.round(clamp(heartRate, 75, 110)),
    breathRate: Math.round(clamp(breathRate, 16, 28)),
    bodyMovement: Math.round(bodyMovement),
  };
}

/** 情绪缓慢漂移，小概率切换 */
function updateEmotion(p) {
  p.emotionPhase += p.emotionDrift + rand(-0.001, 0.001);
  const bias = Math.sin(p.emotionPhase);

  // 基于相位的渐变倾向（calm ↔ sleepy）
  if (bias > 0.4 && p.emotion === 'calm' && Math.random() < 0.06) {
    p.emotion = 'sleepy';
    return;
  }
  if (bias < -0.4 && p.emotion === 'sleepy' && Math.random() < 0.06) {
    p.emotion = 'calm';
    return;
  }

  // 每次 tick 仅 <15% 概率尝试切换，且受稳定性抑制
  if (Math.random() >= 0.15) return;
  if (Math.random() < p.emotionStability) return;

  const r = Math.random();
  if (r < 0.40) p.emotion = 'calm';
  else if (r < 0.70) p.emotion = 'sleepy';
  else if (r < 0.80) p.emotion = 'excited';
  else if (r < 0.90) p.emotion = 'irritable';
  else p.emotion = 'tense';
}

/** 睡眠阶段：sleepy 时按周期推进，否则清醒 */
function updateSleepStage(p) {
  if (p.emotion !== 'sleepy') {
    p.sleepStageIndex = 0;
    p.sleepStageProgress = 0;
    return 'awake';
  }

  p.sleepStageProgress += 1;
  if (p.sleepStageProgress >= p.sleepStageDuration) {
    p.sleepStageProgress = 0;
    p.sleepStageIndex = (p.sleepStageIndex + 1) % SLEEP_CYCLE.length;
    p.sleepStageDuration = 8 + Math.floor(rand(0, 6));
  }
  return SLEEP_CYCLE[p.sleepStageIndex];
}

export function subscribe(ws) {
  subscribers.add(ws);
  ws.on('close', () => subscribers.delete(ws));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of subscribers) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function tick() {
  const children = db.prepare('SELECT id, class_id FROM children').all();
  tickCount += 1;

  for (const child of children) {
    const p = getProfile(child.id);
    updateEmotion(p);
    const emotion = p.emotion;
    const sleepStage = updateSleepStage(p);
    const { heartRate, breathRate, bodyMovement } = generateVitals(p);

    // 外骨骼参数缓慢变化
    if (Math.random() < 0.02) {
      p.exoskeletonMode = MODES[Math.floor(Math.random() * MODES.length)];
    }
    if (Math.random() < 0.03) {
      p.exoskeletonBattery = Math.max(10, p.exoskeletonBattery - 1);
    }

    db.prepare(
      `INSERT INTO monitoring_snapshots (child_id, emotion, sleep_stage, heart_rate, breath_rate, body_movement,
       exoskeleton_mode, exoskeleton_force, exoskeleton_battery, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      child.id,
      emotion,
      sleepStage,
      heartRate,
      breathRate,
      bodyMovement,
      p.exoskeletonMode,
      p.exoskeletonForce,
      p.exoskeletonBattery,
      new Date().toISOString()
    );

    // 报警：阈值 >120，低概率触发
    if (heartRate > 120 && Math.random() > 0.95) {
      const existing = db.prepare(
        'SELECT id FROM alerts WHERE child_id = ? AND resolved = 0 AND type = ? LIMIT 1'
      ).get(child.id, 'heart_rate');
      if (!existing) {
        const alertId = uuid();
        db.prepare(
          'INSERT INTO alerts (id, child_id, class_id, type, message, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          alertId,
          child.id,
          child.class_id,
          'heart_rate',
          `幼儿心率异常 (${heartRate}bpm)，请立即查看`,
          'critical',
          new Date().toISOString()
        );
        broadcast({
          type: 'alert',
          alert: {
            id: alertId,
            childId: child.id,
            message: `心率异常 ${heartRate}bpm`,
            severity: 'critical',
          },
        });
      }
    }

    broadcast({
      type: 'monitoring',
      childId: child.id,
      data: {
        emotion,
        sleepStage,
        heartRate,
        breathRate,
        bodyMovement,
        recordedAt: new Date().toISOString(),
      },
    });
  }
}

export function startSimulator(intervalMs = 5000) {
  if (simulating) return;
  currentIntervalMs = intervalMs;
  simulating = true;
  startedAt = Date.now();
  tickCount = 0;
  intervalId = setInterval(tick, intervalMs);
  console.log(`Device simulator started (interval ${intervalMs}ms, smooth physiological curves)`);
}

export function stopSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  simulating = false;
  console.log('Device simulator stopped');
}

export function isSimulating() {
  return simulating;
}

export function getSimulatorStatus() {
  return {
    running: simulating,
    intervalMs: currentIntervalMs,
    tickCount,
    childCount: profiles.size,
    activeChildren: db.prepare('SELECT COUNT(*) as c FROM children').get().c,
    uptimeMs: startedAt && simulating ? Date.now() - startedAt : 0,
    uptimeText: startedAt && simulating
      ? `${Math.floor((Date.now() - startedAt) / 1000)}s`
      : '0s',
  };
}

/** 清除档案（测试用） */
export function resetProfiles() {
  profiles.clear();
}
