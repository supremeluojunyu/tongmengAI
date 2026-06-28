import { useState, useEffect } from 'react';
import { Slider, Select, message, Tag } from 'antd';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';
import type { SootheRecord } from '../types';

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
    if (recordId) {
      await api.stopSoothe(recordId, Math.floor(Math.random() * 15 + 5));
      setPlaying(false);
      setRecordId(null);
      if (currentChild) api.getSootheRecords(currentChild.id).then(setRecords);
    }
  };

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <h2 className="page-title">🎵 安抚宝宝</h2>

      <div className="section-card slide-up">
        <div className="section-card-title">🎶 音效库</div>
        <div className="sound-grid">
          {SOUNDS.map(s => (
            <button key={s.value} className={`sound-btn ${sound === s.value ? 'active' : ''}`}
              onClick={() => setSound(s.value)}>
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
