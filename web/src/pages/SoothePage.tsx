import { useState, useEffect } from 'react';
import { Slider, Select, message, Tag } from 'antd';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';
import type { SootheRecord } from '../types';

/** Web Audio API 生成安抚音效 */
let audioCtx: AudioContext | null = null;

const activeSound: {
  osc?: OscillatorNode;
  noise?: AudioBufferSourceNode;
  gain?: GainNode;
  lfos: OscillatorNode[];
  extras: OscillatorNode[];
  heartbeatTimer?: ReturnType<typeof setInterval>;
} = { lfos: [], extras: [] };

function getAudioCtx() {
  const Ctx = window.AudioContext
    || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function stopSound() {
  if (activeSound.heartbeatTimer) {
    clearInterval(activeSound.heartbeatTimer);
    activeSound.heartbeatTimer = undefined;
  }
  activeSound.lfos.forEach(l => { try { l.stop(); } catch { /* ignore */ } });
  activeSound.lfos = [];
  activeSound.extras.forEach(o => { try { o.stop(); } catch { /* ignore */ } });
  activeSound.extras = [];
  if (activeSound.osc) {
    try { activeSound.osc.stop(); } catch { /* ignore */ }
    activeSound.osc = undefined;
  }
  if (activeSound.noise) {
    try { activeSound.noise.stop(); } catch { /* ignore */ }
    activeSound.noise = undefined;
  }
  if (activeSound.gain && audioCtx) {
    try {
      activeSound.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    } catch { /* ignore */ }
    setTimeout(() => { try { activeSound.gain?.disconnect(); } catch { /* ignore */ } }, 600);
    activeSound.gain = undefined;
  }
}

function playSound(type: string) {
  stopSound();
  const ctx = getAudioCtx();

  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  activeSound.gain = gainNode;

  switch (type) {
    case 'rain': {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      source.connect(filter).connect(gainNode);
      source.start();
      activeSound.noise = source;
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      break;
    }
    case 'ocean': {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      source.connect(filter).connect(gainNode);
      source.start();
      activeSound.noise = source;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.15;
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain).connect(gainNode.gain);
      lfo.start();
      activeSound.lfos.push(lfo);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      break;
    }
    case 'birds': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1200;
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 6;
      vibratoGain.gain.value = 30;
      vibrato.connect(vibratoGain).connect(osc.frequency);
      vibrato.start();
      activeSound.lfos.push(vibrato);
      osc.connect(gainNode);
      osc.start();
      activeSound.osc = osc;
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      break;
    }
    case 'wind': {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 300;
      filter.Q.value = 0.5;
      source.connect(filter).connect(gainNode);
      source.start();
      activeSound.noise = source;
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      break;
    }
    case 'music': {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const noteGain = ctx.createGain();
        noteGain.gain.value = 0.06;
        osc.connect(noteGain).connect(gainNode);
        osc.start(ctx.currentTime + i * 0.5);
        osc.stop(ctx.currentTime + i * 0.5 + 1.5);
        activeSound.extras.push(osc);
      });
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      break;
    }
    case 'story': {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 150;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      osc.connect(filter).connect(gainNode);
      osc.start();
      activeSound.osc = osc;
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
      break;
    }
    case 'heartbeat': {
      const pulse = () => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 60;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        o.connect(g).connect(gainNode);
        o.start();
        o.stop(ctx.currentTime + 0.15);
      };
      pulse();
      setTimeout(pulse, 200);
      activeSound.heartbeatTimer = setInterval(pulse, 1000);
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      break;
    }
    case 'shushing': {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start();
      activeSound.noise = source;
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      break;
    }
    case 'lullaby': {
      const melody = [392, 440, 494, 523, 494, 440, 392, 330];
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const noteGain = ctx.createGain();
        noteGain.gain.value = 0.08;
        osc.connect(noteGain).connect(gainNode);
        osc.start(ctx.currentTime + i * 0.6);
        osc.stop(ctx.currentTime + i * 0.6 + 0.5);
        activeSound.extras.push(osc);
      });
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      break;
    }
    case 'crickets': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 4000;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 4;
      lfoGain.gain.value = 4000;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start();
      activeSound.lfos.push(lfo);
      osc.connect(gainNode);
      osc.start();
      activeSound.osc = osc;
      gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
      break;
    }
    case 'train': {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      source.connect(filter).connect(gainNode);
      source.start();
      activeSound.noise = source;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.8;
      lfoGain.gain.value = 0.1;
      lfo.connect(lfoGain).connect(gainNode.gain);
      lfo.start();
      activeSound.lfos.push(lfo);
      gainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      break;
    }
    case 'vacuum': {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1;
      source.connect(filter).connect(gainNode);
      source.start();
      activeSound.noise = source;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      break;
    }
    default:
      break;
  }
}

const SOUNDS = [
  { value: 'rain', emoji: '🌧️', label: '雨声' },
  { value: 'ocean', emoji: '🌊', label: '海浪' },
  { value: 'birds', emoji: '🐦', label: '鸟鸣' },
  { value: 'wind', emoji: '🍃', label: '风声' },
  { value: 'music', emoji: '🎵', label: '轻音乐' },
  { value: 'story', emoji: '📖', label: '睡前故事' },
];

const POSTURES = [
  { value: 'horizontal', emoji: '🤱', label: '横抱' },
  { value: 'vertical', emoji: '👶', label: '竖抱' },
  { value: 'static', emoji: '😴', label: '静置' },
];

const FORCES = [
  { value: 'gentle', stars: 1, label: '轻柔' },
  { value: 'standard', stars: 2, label: '标准' },
  { value: 'strong', stars: 3, label: '加强' },
];

export default function SoothePage() {
  const currentChild = useAppStore(s => s.currentChild);
  const [sound, setSound] = useState('rain');
  const [brightness, setBrightness] = useState(40);
  const [lightColor, setLightColor] = useState('warm');
  const [posture, setPosture] = useState('horizontal');
  const [force, setForce] = useState('standard');
  const [duration, setDuration] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [records, setRecords] = useState<SootheRecord[]>([]);

  useEffect(() => {
    if (currentChild) api.getSootheRecords(currentChild.id).then(setRecords).catch(() => {});
  }, [currentChild]);

  useEffect(() => () => stopSound(), []);

  const start = async () => {
    if (!currentChild) { message.warning('请先选择宝宝'); return; }
    try {
      const res = await api.startSoothe({
        childId: currentChild.id, soundType: sound, lightBrightness: brightness,
        lightColor, posture, forceLevel: force, durationMin: duration,
      }) as { id: string };
      setRecordId(res.id);
      setPlaying(true);
      await api.setExoskeleton({ childId: currentChild.id, mode: posture, forceLevel: force });
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '启动失败');
    }
  };

  const stop = async () => {
    stopSound();
    if (recordId) {
      await api.stopSoothe(recordId, Math.floor(Math.random() * 15 + 5));
      setPlaying(false);
      setRecordId(null);
      if (currentChild) api.getSootheRecords(currentChild.id).then(setRecords);
    }
  };

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div className="section-card slide-up">
        <div className="section-card-title">🎶 音效库</div>
        <div className="sound-grid">
          {SOUNDS.map(s => (
            <button key={s.value} className={`sound-btn ${sound === s.value ? 'active' : ''}`}
              onClick={() => { setSound(s.value); playSound(s.value); }}>
              <span className="sound-emoji">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card slide-up">
        <div className="section-card-title">💡 灯光调节</div>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
          亮度 {brightness}%
        </div>
        <Slider value={brightness} onChange={setBrightness} trackStyle={{ background: 'var(--gradient-main)' }}
          handleStyle={{ borderColor: '#FFB6C1', boxShadow: '0 2px 8px rgba(255,182,193,0.4)' }} />
        <div className={`light-preview ${lightColor} breathe`}
          style={{ opacity: brightness / 100, transform: `scale(${0.7 + brightness / 200})` }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[{ v: 'warm', l: '暖光 🌅' }, { v: 'moon', l: '月光 🌙' }, { v: 'gradient', l: '渐变 🌈' }].map(c => (
            <button key={c.v} className={`sound-btn ${lightColor === c.v ? 'active' : ''}`}
              style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setLightColor(c.v)}>
              {c.l}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card slide-up">
        <div className="section-card-title">🤱 外骨骼姿势</div>
        <div className="posture-grid">
          {POSTURES.map(p => (
            <button key={p.value} className={`posture-btn ${posture === p.value ? 'active' : ''}`}
              onClick={() => setPosture(p.value)}>
              <span className="posture-emoji">{p.emoji}</span>
              <span style={{ fontSize: 13 }}>{p.label}</span>
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>支撑力度</div>
        <div className="star-row">
          {FORCES.map(f => (
            <button key={f.value} className={`star-btn ${force === f.value ? 'active' : ''}`}
              onClick={() => setForce(f.value)} title={f.label}>
              {'⭐'.repeat(f.stars)}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card slide-up">
        <div className="section-card-title">⏰ 定时关闭</div>
        <Select value={duration} onChange={setDuration} style={{ width: '100%' }} size="large"
          options={[{ value: 15, label: '🕐 15 分钟' }, { value: 30, label: '🕑 30 分钟' }, { value: 60, label: '🕒 60 分钟' }]} />
      </div>

      <button className={`soothe-main-btn ${playing ? 'stop' : 'start'}`} onClick={playing ? stop : start}>
        {playing ? '⏸ 停止安抚' : '▶️ 开始安抚'}
      </button>

      {records.length > 0 && (
        <div className="section-card slide-up">
          <div className="section-card-title">📝 最近记录</div>
          {records.slice(0, 3).map(r => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 14 }}>
              <Tag color={r.trigger_type === 'auto' ? 'processing' : 'success'} style={{ borderRadius: 10 }}>
                {r.trigger_type === 'auto' ? '自动' : '手动'}
              </Tag>
              {SOUNDS.find(s => s.value === r.sound_type)?.emoji}{' '}
              {SOUNDS.find(s => s.value === r.sound_type)?.label || r.sound_type}
              {r.effect_minutes_saved ? (
                <span style={{ color: '#52c41a', marginLeft: 8, fontSize: 12 }}>
                  入睡缩短 {r.effect_minutes_saved} 分钟 ✨
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
