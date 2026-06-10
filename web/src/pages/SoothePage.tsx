import { useState, useEffect } from 'react';
import { Card, Slider, Radio, Button, Select, message, List, Tag } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';
import type { SootheRecord } from '../types';

const SOUNDS = [
  { value: 'rain', label: '🌧️ 雨声' },
  { value: 'ocean', label: '🌊 海浪' },
  { value: 'birds', label: '🐦 鸟鸣' },
  { value: 'wind', label: '🍃 风声' },
  { value: 'music', label: '🎵 轻音乐' },
  { value: 'story', label: '📖 睡前故事' },
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
    if (currentChild) {
      api.getSootheRecords(currentChild.id).then(setRecords).catch(() => {});
    }
  }, [currentChild]);

  const start = async () => {
    if (!currentChild) { message.warning('请先选择儿童'); return; }
    try {
      const res = await api.startSoothe({
        childId: currentChild.id, soundType: sound, lightBrightness: brightness,
        lightColor, posture, forceLevel: force, durationMin: duration,
      }) as { id: string };
      setRecordId(res.id);
      setPlaying(true);
      await api.setExoskeleton({ childId: currentChild.id, mode: posture, forceLevel: force });
      message.success('安抚模式已启动');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '启动失败');
    }
  };

  const stop = async () => {
    if (recordId) {
      await api.stopSoothe(recordId, Math.floor(Math.random() * 15 + 5));
      setPlaying(false);
      setRecordId(null);
      message.info('安抚已停止');
      if (currentChild) api.getSootheRecords(currentChild.id).then(setRecords);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 16, fontWeight: 500 }}>🎵 安抚控制</h2>

      <Card className="card-soft" title="音效库" size="small" style={{ marginBottom: 12 }}>
        <Radio.Group value={sound} onChange={e => setSound(e.target.value)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SOUNDS.map(s => <Radio.Button key={s.value} value={s.value}>{s.label}</Radio.Button>)}
        </Radio.Group>
      </Card>

      <Card className="card-soft" title="灯光调节" size="small" style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 12 }}>亮度：{brightness}%</div>
        <Slider value={brightness} onChange={setBrightness} />
        <Radio.Group value={lightColor} onChange={e => setLightColor(e.target.value)} style={{ marginTop: 8 }}>
          <Radio value="warm">暖光</Radio>
          <Radio value="moon">月光</Radio>
          <Radio value="gradient">渐变</Radio>
        </Radio.Group>
      </Card>

      <Card className="card-soft" title="外骨骼姿势" size="small" style={{ marginBottom: 12 }}>
        <Radio.Group value={posture} onChange={e => setPosture(e.target.value)} style={{ marginBottom: 12 }}>
          <Radio.Button value="horizontal">横抱</Radio.Button>
          <Radio.Button value="vertical">竖抱</Radio.Button>
          <Radio.Button value="static">静置</Radio.Button>
        </Radio.Group>
        <div>力度：</div>
        <Radio.Group value={force} onChange={e => setForce(e.target.value)}>
          <Radio value="gentle">轻柔</Radio>
          <Radio value="standard">标准</Radio>
          <Radio value="strong">加强</Radio>
        </Radio.Group>
      </Card>

      <Card className="card-soft" title="定时关闭" size="small" style={{ marginBottom: 16 }}>
        <Select value={duration} onChange={setDuration} style={{ width: '100%' }}
          options={[{ value: 15, label: '15 分钟' }, { value: 30, label: '30 分钟' }, { value: 60, label: '60 分钟' }]} />
      </Card>

      <Button type="primary" size="large" block icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        onClick={playing ? stop : start}
        style={{ height: 52, borderRadius: 26, background: playing ? '#ff7875' : '#7eb8da', border: 'none', marginBottom: 20 }}>
        {playing ? '停止安抚' : '开始安抚'}
      </Button>

      <Card className="card-soft" title="最近安抚记录" size="small">
        <List size="small" dataSource={records.slice(0, 3)} renderItem={r => (
          <List.Item>
            <div>
              <Tag color={r.trigger_type === 'auto' ? 'blue' : 'green'}>{r.trigger_type === 'auto' ? '自动' : '手动'}</Tag>
              {SOUNDS.find(s => s.value === r.sound_type)?.label || r.sound_type}
              {r.effect_minutes_saved ? <span style={{ color: '#52c41a', marginLeft: 8 }}>入睡缩短 {r.effect_minutes_saved} 分钟</span> : null}
            </div>
          </List.Item>
        )} />
      </Card>
    </div>
  );
}
