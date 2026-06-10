import db from '../db/index.js';
import { v4 as uuid } from 'uuid';

const EMOTIONS = ['calm', 'sleepy', 'excited', 'irritable', 'tense'];
const STAGES = ['awake', 'light', 'deep', 'rem'];
const MODES = ['horizontal', 'vertical', 'static'];
const FORCES = ['gentle', 'standard', 'strong'];

let intervalId = null;
const subscribers = new Set();

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

  for (const child of children) {
    const emotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
    const sleepStage = STAGES[Math.floor(Math.random() * STAGES.length)];
    const heartRate = 70 + Math.floor(Math.random() * 35);
    const breathRate = 16 + Math.floor(Math.random() * 8);

    db.prepare(
      `INSERT INTO monitoring_snapshots (child_id, emotion, sleep_stage, heart_rate, breath_rate, body_movement,
       exoskeleton_mode, exoskeleton_force, exoskeleton_battery, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      child.id, emotion, sleepStage, heartRate, breathRate,
      Math.floor(Math.random() * 4),
      MODES[Math.floor(Math.random() * MODES.length)],
      FORCES[Math.floor(Math.random() * FORCES.length)],
      50 + Math.floor(Math.random() * 50),
      new Date().toISOString()
    );

    if (heartRate > 115 && Math.random() > 0.7) {
      const existing = db.prepare(
        'SELECT id FROM alerts WHERE child_id = ? AND resolved = 0 AND type = ? LIMIT 1'
      ).get(child.id, 'heart_rate');
      if (!existing) {
        const alertId = uuid();
        db.prepare(
          'INSERT INTO alerts (id, child_id, class_id, type, message, severity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          alertId, child.id, child.class_id, 'heart_rate',
          `幼儿心率异常 (${heartRate}bpm)，请立即查看`,
          'critical', new Date().toISOString()
        );
        broadcast({ type: 'alert', alert: { id: alertId, childId: child.id, message: `心率异常 ${heartRate}bpm`, severity: 'critical' } });
      }
    }

    broadcast({
      type: 'monitoring',
      childId: child.id,
      data: { emotion, sleepStage, heartRate, breathRate, recordedAt: new Date().toISOString() },
    });
  }
}

export function startSimulator(intervalMs = 5000) {
  if (intervalId) return;
  intervalId = setInterval(tick, intervalMs);
  console.log(`Device simulator running every ${intervalMs}ms`);
}

export function stopSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
