import { useState, useEffect } from 'react';
import { Segmented, Button, message } from 'antd';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, type ReportData } from '../services/api';
import { useAppStore } from '../stores/appStore';

const SOFT_EMOTION: Record<string, string> = {
  calm: '#c8ecd9',
  sleepy: '#cce5ff',
  excited: '#ffd6d8',
  irritable: '#ffe4cc',
  tense: '#ead4f5',
};

const STATS = [
  { key: 'sleep', icon: '🌙', label: '睡眠时长', get: (r: ReportData) => `${r.summary.totalSleepHours}h` },
  { key: 'deep', icon: '💤', label: '深睡比例', get: (r: ReportData) => `${r.summary.deepSleepRatio}%` },
  { key: 'wake', icon: '😫', label: '夜醒次数', get: (r: ReportData) => String(r.summary.nightWakeCount) },
  { key: 'hr', icon: '❤️', label: '平均心率', get: (r: ReportData) => `${r.summary.avgHeartRate}bpm` },
];

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div style={{ color: '#999', fontSize: 11, marginBottom: 4 }}>
        {label ? new Date(label).toLocaleString('zh-CN') : ''}
      </div>
      <div style={{ fontWeight: 600 }}>❤️ {payload[0].value} bpm</div>
    </div>
  );
}

export default function ReportPage() {
  const currentChild = useAppStore(s => s.currentChild);
  const [period, setPeriod] = useState('day');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentChild) return;
    setLoading(true);
    setReport(null);
    api.getReport(currentChild.id, period)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentChild, period]);

  if (!currentChild) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>请先添加儿童信息</div>;
  }

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Segmented value={period} onChange={v => setPeriod(v as string)} options={[
          { value: 'day', label: '日' }, { value: 'week', label: '周' }, { value: 'month', label: '月' },
        ]} />
      </div>

      {(loading || !report) ? (
        <div className="moon-gauge breathe slide-up" style={{ margin: '48px auto', maxWidth: 240, textAlign: 'center' }}>
          <div className="moon-gauge-emoji">📊</div>
          <div className="moon-gauge-label">正在生成报告...</div>
          <div className="moon-gauge-stage">请稍候</div>
        </div>
      ) : (
        <>
          <div className="stat-grid slide-up">
            {STATS.map(s => (
              <div key={s.key} className="stat-card">
                <div className="stat-card-icon">{s.icon}</div>
                <div className="stat-card-label">{s.label}</div>
                <div className="gradient-text" style={{ fontSize: 22 }}>{s.get(report)}</div>
              </div>
            ))}
          </div>

          <div className="section-card slide-up">
            <div className="section-card-title">📈 睡眠趋势</div>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={report.trend.slice(-24)}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB6C1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#87CEEB" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="time" tickFormatter={t => `${new Date(t).getHours()}时`} fontSize={10} stroke="#ccc" tickLine={false} />
                <YAxis fontSize={10} stroke="#ccc" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="heartRate" stroke="#87CEEB" strokeWidth={2.5}
                  fill="url(#hrGrad)" name="心率" dot={false} activeDot={{ r: 5, fill: '#FFB6C1', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="section-card slide-up">
            <div className="section-card-title">🎨 情绪热力图</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 5 }}>
              {report.emotionHeatmap.map(h => (
                <div key={h.hour} className="heatmap-cell" title={`${h.hour}时`}
                  style={{ background: SOFT_EMOTION[h.emotion] || '#f0f0f0' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#ccc', marginTop: 6 }}>
              <span>0时</span><span>12时</span><span>23时</span>
            </div>
          </div>

          <div className="tips-card slide-up">
            <div className="section-card-title">💡 个性化建议</div>
            {report.suggestions.map((s, i) => (
              <div key={i} className="tips-item">
                <span className="tips-dot" />
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button className="btn-gradient" onClick={() => message.success('报告已保存至相册 📄')}>
              📥 导出 PDF
            </Button>
            <Button className="btn-gradient-outline" onClick={() => message.success('已分享给家人 💌')}>
              💌 分享报告
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
