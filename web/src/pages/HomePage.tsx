import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Button, notification } from 'antd';
import { SoundOutlined, AudioOutlined, BarChartOutlined } from '@ant-design/icons';
import { api, connectWebSocket } from '../services/api';
import { useAppStore } from '../stores/appStore';
import type { MonitoringData, Child, Device } from '../types';
import { EMOTION_LABELS } from '../types';
import AnimatedNumber from '../components/AnimatedNumber';

const EMOTION_EMOJI: Record<string, string> = {
  calm: '😌',
  sleepy: '😴',
  excited: '😤',
  irritable: '😠',
  tense: '😰',
};

const DEVICE_EMOJI: Record<string, string> = {
  nirs: '🧠',
  ppg: '💓',
  exoskeleton: '🤱',
};

const LONG_PRESS_MS = 3000;
const RING_RADIUS = 18;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function batteryColor(pct: number) {
  if (pct > 60) return 'linear-gradient(90deg, #a8e6cf, #52c41a)';
  if (pct > 30) return 'linear-gradient(90deg, #ffd666, #faad14)';
  return 'linear-gradient(90deg, #ffccc7, #ff7875)';
}

export default function HomePage() {
  const navigate = useNavigate();
  const { children, currentChild, setChildren, setCurrentChild } = useAppStore();
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [soothing, setSoothing] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [moonFlash, setMoonFlash] = useState(false);

  const pressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStart = useRef(0);
  const simRunningRef = useRef(false);
  const togglingRef = useRef(false);
  const pressActiveRef = useRef(false);

  const loadChildren = useCallback(async () => {
    try {
      const list = await api.getChildren();
      setChildren(list);
      if (!currentChild && list.length) setCurrentChild(list[0]);
      else if (currentChild && !list.find(c => c.id === currentChild.id) && list.length) setCurrentChild(list[0]);
    } catch { /* ignore */ }
  }, [currentChild, setChildren, setCurrentChild]);

  const loadMonitoring = useCallback(async (childId: string) => {
    try {
      const data = await api.getMonitoring(childId);
      setMonitoring(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  useEffect(() => {
    simRunningRef.current = simRunning;
  }, [simRunning]);

  useEffect(() => {
    const syncStatus = () => {
      api.getSimulatorStatus()
        .then(s => setSimRunning(s.running))
        .catch(() => {});
    };
    syncStatus();
    const timer = setInterval(syncStatus, 8000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (currentChild) loadMonitoring(currentChild.id);
    const interval = setInterval(() => {
      if (currentChild) loadMonitoring(currentChild.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentChild, loadMonitoring]);

  useEffect(() => {
    const ws = connectWebSocket((data: unknown) => {
      const msg = data as { type: string; childId?: string; alert?: { message: string }; data?: Partial<MonitoringData> };
      if (msg.type === 'monitoring' && msg.childId === currentChild?.id && msg.data) {
        const d = msg.data as { emotion?: string; heartRate?: number; breathRate?: number; sleepStage?: string };
        setMonitoring(prev => prev ? {
          ...prev,
          emotion: d.emotion || prev.emotion,
          heart_rate: d.heartRate ?? prev.heart_rate,
          breath_rate: d.breathRate ?? prev.breath_rate,
          sleep_stage: d.sleepStage ?? prev.sleep_stage,
          recorded_at: new Date().toISOString(),
        } : prev);
      }
      if (msg.type === 'alert' && msg.alert) {
        notification.error({ message: '异常报警', description: msg.alert.message, duration: 0 });
      }
    });
    return () => ws.close();
  }, [currentChild]);

  const subtleFeedback = (stopped?: boolean) => {
    setMoonFlash(true);
    setTimeout(() => setMoonFlash(false), stopped ? 900 : 600);
    if (navigator.vibrate) navigator.vibrate(stopped ? [30, 40, 30] : 30);
  };

  const toggleHiddenSim = async () => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    try {
      const status = await api.getSimulatorStatus();
      const res = status.running
        ? await api.stopSimulator()
        : await api.startSimulator();
      setSimRunning(!!res.running);
      simRunningRef.current = !!res.running;
      subtleFeedback(!res.running);
    } catch { /* 静默失败，不暴露任何提示 */ }
    finally {
      togglingRef.current = false;
    }
  };

  const clearPress = () => {
    if (pressTimer.current) clearInterval(pressTimer.current);
    pressTimer.current = null;
    pressActiveRef.current = false;
    setIsPressing(false);
    setPressProgress(0);
  };

  const onPressStart = (e: React.PointerEvent) => {
    if (pressActiveRef.current || e.button > 0) return;
    e.preventDefault();
    pressActiveRef.current = true;
    setIsPressing(true);
    pressStart.current = Date.now();
    pressTimer.current = setInterval(() => {
      const elapsed = Date.now() - pressStart.current;
      const pct = Math.min(100, (elapsed / LONG_PRESS_MS) * 100);
      setPressProgress(pct);
      if (elapsed >= LONG_PRESS_MS) {
        clearPress();
        toggleHiddenSim();
      }
    }, 50);
  };

  const quickSoothe = async () => {
    if (!currentChild) return;
    setSoothing(true);
    try {
      await api.startSoothe({
        childId: currentChild.id, soundType: 'rain',
        lightBrightness: 40, lightColor: 'warm', durationMin: 30,
      });
    } catch { /* ignore */ }
    finally { setSoothing(false); }
  };

  const emotion = monitoring?.emotion || 'calm';
  const emotionLabel = monitoring?.emotionInfo?.label || EMOTION_LABELS[emotion] || '平静';
  const emoji = EMOTION_EMOJI[emotion] || '😌';
  const hr = monitoring?.heart_rate ?? '--';
  const br = monitoring?.breath_rate ?? '--';

  return (
    <div className="fade-in" style={{ padding: '16px 16px 0' }}>
      {/* 头部：月亮长按隐蔽触发 */}
      <div className="home-header">
        <div className="home-title-area">
          <div
            className="moon-trigger"
            onPointerDown={onPressStart}
            onPointerUp={clearPress}
            onPointerLeave={clearPress}
            onPointerCancel={clearPress}
            onContextMenu={e => e.preventDefault()}
          >
            <svg className={`long-press-ring ${isPressing ? 'active' : ''}`} width="44" height="44" viewBox="0 0 44 44">
              <circle className="bg" cx="22" cy="22" r={RING_RADIUS} />
              <circle
                className="progress"
                cx="22" cy="22" r={RING_RADIUS}
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC - (RING_CIRC * pressProgress) / 100}
              />
            </svg>
            <span className={`moon-icon ${moonFlash ? 'moon-flash' : ''}`}>🌙</span>
          </div>
          <div>
            <div className="home-title-text">实时监测</div>
            <Select
              value={currentChild?.id}
              onChange={id => setCurrentChild(children.find(c => c.id === id) || null)}
              style={{ width: 130, fontWeight: 600 }}
              variant="borderless"
              options={children.map((c: Child) => ({ value: c.id, label: c.nickname }))}
            />
          </div>
        </div>
        <div className="status-badge">
          {monitoring ? <span className="online-dot" /> : <span className="offline-dot" />}
          {monitoring ? '设备在线' : '等待数据'}
        </div>
      </div>

      {/* 月亮脸情绪仪表盘 */}
      <div className={`moon-gauge breathe ${emotion} slide-up`}>
        <div className="moon-gauge-emoji">{emoji}</div>
        <div className="moon-gauge-label">{emotionLabel}</div>
        <div className="moon-gauge-stage">{monitoring?.sleepStageLabel || '监测中'}</div>
      </div>

      {/* 心率 / 呼吸 */}
      <div className="vital-grid slide-up">
        <div className="vital-card">
          <div className="vital-card-icon">❤️</div>
          <div className={`vital-card-value ${typeof hr === 'number' ? 'heartbeat' : ''}`}
            style={{ color: typeof hr === 'number' && hr > 110 ? '#ff7875' : undefined }}>
            <AnimatedNumber value={hr} />
            <span className="vital-card-unit">bpm</span>
          </div>
        </div>
        <div className="vital-card">
          <div className="vital-card-icon">🫁</div>
          <div className="vital-card-value">
            <AnimatedNumber value={br} />
            <span className="vital-card-unit">/min</span>
          </div>
        </div>
        <div className="vital-card">
          <div className="vital-card-icon">😴</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
            {monitoring?.sleepStageLabel || '--'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>睡眠阶段</div>
        </div>
        <div className="vital-card">
          <div className="vital-card-icon">🤱</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
            {monitoring?.exoskeleton_mode === 'horizontal' ? '横抱'
              : monitoring?.exoskeleton_mode === 'vertical' ? '竖抱' : '静置'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            外骨骼 · {monitoring?.exoskeleton_battery ?? 0}%
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Button
          className="soothe-btn"
          type="primary"
          icon={<SoundOutlined style={{ fontSize: 20 }} />}
          size="large"
          loading={soothing}
          onClick={quickSoothe}
        >
          一键安抚
        </Button>
        <Button className="round-btn" icon={<AudioOutlined style={{ fontSize: 20 }} />} size="large" />
        <Button className="round-btn" icon={<BarChartOutlined style={{ fontSize: 20 }} />} size="large"
          onClick={() => navigate('/report')} />
      </div>

      {/* 设备状态 */}
      {monitoring?.devices && monitoring.devices.length > 0 && (
        <div className="card-soft slide-up" style={{ padding: 16, marginBottom: 16 }}>
          <div className="device-card-title">📡 设备状态</div>
          {monitoring.devices.map((d: Device) => (
            <div key={d.id} className="device-row">
              <span className="device-emoji">{DEVICE_EMOJI[d.type] || '📟'}</span>
              <div className="device-info">
                <div className="device-name">{d.name}</div>
                <div className="device-battery-bar">
                  <div className="device-battery-fill" style={{
                    width: `${d.battery}%`,
                    background: batteryColor(d.battery),
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                {d.status === 'online' ? <span className="online-dot" /> : <span className="offline-dot" />}
                {d.battery}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
