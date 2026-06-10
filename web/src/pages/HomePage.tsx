import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Card, Button, Badge, message, notification } from 'antd';
import { SoundOutlined, AudioOutlined, BarChartOutlined, WifiOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, connectWebSocket } from '../services/api';
import { useAppStore } from '../stores/appStore';
import type { MonitoringData, Child } from '../types';
import { EMOTION_LABELS, EMOTION_COLORS } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const { children, currentChild, setChildren, setCurrentChild } = useAppStore();
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [soothing, setSoothing] = useState(false);

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

  const quickSoothe = async () => {
    if (!currentChild) return;
    setSoothing(true);
    try {
      await api.startSoothe({ childId: currentChild.id, soundType: 'rain', lightBrightness: 40, lightColor: 'warm', durationMin: 30 });
      message.success('已开始播放雨声白噪音');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '启动失败');
    }
  };

  const emotion = monitoring?.emotion || 'calm';
  const emotionColor = EMOTION_COLORS[emotion] || '#52c41a';
  const emotionLabel = monitoring?.emotionInfo?.label || EMOTION_LABELS[emotion] || '平静';

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: '#999' }}>实时监测</div>
          <Select
            value={currentChild?.id}
            onChange={(id) => setCurrentChild(children.find(c => c.id === id) || null)}
            style={{ width: 140 }}
            bordered={false}
            options={children.map((c: Child) => ({ value: c.id, label: c.nickname }))}
          />
        </div>
        <Badge status={monitoring ? 'success' : 'default'} text={monitoring ? '设备在线' : '等待数据'} />
      </div>

      <div className="emotion-gauge" style={{ background: `linear-gradient(135deg, ${emotionColor}22, ${emotionColor}44)`, border: `3px solid ${emotionColor}` }}>
        <div style={{ fontSize: 28, fontWeight: 600, color: emotionColor }}>{emotionLabel}</div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{monitoring?.sleepStageLabel || '浅睡'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
        <Card className="card-soft" size="small" styles={{ body: { padding: 16 } }}>
          <div style={{ color: '#999', fontSize: 12 }}>❤️ 心率</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: (monitoring?.heart_rate ?? 0) > 110 ? '#ff4d4f' : '#2c3e50' }}>
            {monitoring?.heart_rate || '--'} <span style={{ fontSize: 14 }}>bpm</span>
          </div>
        </Card>
        <Card className="card-soft" size="small" styles={{ body: { padding: 16 } }}>
          <div style={{ color: '#999', fontSize: 12 }}>🫁 呼吸</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{monitoring?.breath_rate || '--'} <span style={{ fontSize: 14 }}>/min</span></div>
        </Card>
        <Card className="card-soft" size="small" styles={{ body: { padding: 16 } }}>
          <div style={{ color: '#999', fontSize: 12 }}>😴 睡眠阶段</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{monitoring?.sleepStageLabel || '--'}</div>
        </Card>
        <Card className="card-soft" size="small" styles={{ body: { padding: 16 } }}>
          <div style={{ color: '#999', fontSize: 12 }}><ThunderboltOutlined /> 外骨骼</div>
          <div style={{ fontSize: 14 }}>{monitoring?.exoskeleton_mode || '横抱'} · {monitoring?.exoskeleton_battery || 0}%</div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Button type="primary" icon={<SoundOutlined />} size="large" loading={soothing} onClick={quickSoothe}
          style={{ flex: 1, height: 52, borderRadius: 26, background: 'linear-gradient(135deg, #7eb8da, #a8d8ea)', border: 'none' }}>
          一键安抚
        </Button>
        <Button icon={<AudioOutlined />} size="large" onClick={() => message.info('语音控制：说"开始安抚"或"查看报告"')}
          style={{ width: 52, height: 52, borderRadius: 26 }} />
        <Button icon={<BarChartOutlined />} size="large" onClick={() => navigate('/report')}
          style={{ width: 52, height: 52, borderRadius: 26 }} />
      </div>

      {monitoring?.devices && monitoring.devices.length > 0 && (
        <Card className="card-soft" title={<><WifiOutlined /> 设备状态</>} size="small">
          {monitoring.devices.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>{d.name}</span>
              <span style={{ color: d.status === 'online' ? '#52c41a' : '#999' }}>{d.battery}% · {d.status === 'online' ? '在线' : '离线'}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
