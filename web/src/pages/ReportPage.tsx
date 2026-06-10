import { useState, useEffect } from 'react';
import { Card, Segmented, Button, message, List } from 'antd';
import { ShareAltOutlined, DownloadOutlined } from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, type ReportData } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { EMOTION_COLORS } from '../types';

export default function ReportPage() {
  const currentChild = useAppStore(s => s.currentChild);
  const [period, setPeriod] = useState('day');
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (currentChild) {
      api.getReport(currentChild.id, period).then(setReport).catch(() => {});
    }
  }, [currentChild, period]);

  if (!currentChild) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>请先添加儿童信息</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 500 }}>📊 {currentChild.nickname} 的数据报告</h2>
        <Segmented value={period} onChange={v => setPeriod(v as string)} options={[
          { value: 'day', label: '日' }, { value: 'week', label: '周' }, { value: 'month', label: '月' },
        ]} />
      </div>

      {report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: '睡眠时长', value: `${report.summary.totalSleepHours}h` },
              { label: '深睡比例', value: `${report.summary.deepSleepRatio}%` },
              { label: '夜醒次数', value: report.summary.nightWakeCount },
              { label: '平均心率', value: `${report.summary.avgHeartRate}bpm` },
            ].map(item => (
              <Card key={item.label} className="card-soft" size="small" styles={{ body: { padding: 12, textAlign: 'center' } }}>
                <div style={{ color: '#999', fontSize: 12 }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>{item.value}</div>
              </Card>
            ))}
          </div>

          <Card className="card-soft" title="睡眠趋势" size="small" style={{ marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={report.trend.slice(-24)}>
                <XAxis dataKey="time" tickFormatter={t => new Date(t).getHours() + '时'} fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip labelFormatter={t => new Date(t).toLocaleString('zh-CN')} />
                <Area type="monotone" dataKey="heartRate" stroke="#7eb8da" fill="#7eb8da33" name="心率" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="card-soft" title="情绪热力图（按小时）" size="small" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4 }}>
              {report.emotionHeatmap.map(h => (
                <div key={h.hour} title={`${h.hour}时`}
                  style={{ height: 24, borderRadius: 4, background: EMOTION_COLORS[h.emotion] || '#eee', opacity: 0.8 }} />
              ))}
            </div>
          </Card>

          <Card className="card-soft" title="💡 个性化建议" size="small" style={{ marginBottom: 16 }}>
            <List size="small" dataSource={report.suggestions} renderItem={s => <List.Item>{s}</List.Item>} />
          </Card>

          <div style={{ display: 'flex', gap: 12 }}>
            <Button icon={<DownloadOutlined />} onClick={() => message.success('报告已生成（演示模式）')} style={{ flex: 1 }}>导出 PDF</Button>
            <Button icon={<ShareAltOutlined />} onClick={() => message.success('已分享至微信（演示）')} style={{ flex: 1 }}>分享报告</Button>
          </div>
        </>
      )}
    </div>
  );
}
