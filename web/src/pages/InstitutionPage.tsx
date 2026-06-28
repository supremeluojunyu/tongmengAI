import { useState, useEffect } from 'react';
import { Button, message, Modal, Checkbox, Row, Col } from 'antd';
import { api } from '../services/api';
import { EMOTION_LABELS } from '../types';

const SOFT_EMOTION_BG: Record<string, string> = {
  calm: '#c8ecd9', sleepy: '#cce5ff', excited: '#ffd6d8',
  irritable: '#ffe4cc', tense: '#ead4f5',
};
const SOFT_EMOTION_TEXT: Record<string, string> = {
  calm: '#5a9e72', sleepy: '#5a8fc4', excited: '#c97078',
  irritable: '#c08850', tense: '#9a70b0',
};

interface StudentStatus {
  id: string;
  nickname: string;
  gender?: string;
  monitoring?: { emotion: string; heart_rate: number };
}

interface ClassData {
  id: string;
  name: string;
  students: StudentStatus[];
}

export default function InstitutionPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; message: string; nickname: string }[]>([]);
  const [shareModal, setShareModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async () => {
    try {
      const [dash, alertList] = await Promise.all([
        api.getInstitutionDashboard() as Promise<ClassData[]>,
        api.getAlerts() as Promise<{ id: string; message: string; nickname: string }[]>,
      ]);
      setClasses(dash);
      setAlerts(alertList);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const allStudents = classes.flatMap(c => c.students);

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <h2 className="page-title">🏫 班级看板</h2>

      {alerts.length > 0 && (
        <div className="alert-card slide-up">
          <div className="section-card-title" style={{ color: '#cf5050' }}>
            <span className="alert-icon-blink">🚨</span> 异常提醒
          </div>
          {alerts.slice(0, 3).map(a => (
            <div key={a.id} className="alert-row">
              <span>⚠️</span>
              <span><strong>{a.nickname}</strong>：{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {classes.map(cls => (
        <div key={cls.id} className="section-card slide-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="section-card-title" style={{ margin: 0 }}>🌈 {cls.name}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="small" className="action-btn-sm" onClick={async () => {
                try {
                  const res = await api.batchSoothe(cls.id) as { message: string };
                  message.success(res.message);
                } catch (e: unknown) {
                  message.error(e instanceof Error ? e.message : '操作失败');
                }
              }}>🎵 批量安抚</Button>
              <Button size="small" className="action-btn-sm"
                style={{ background: 'linear-gradient(135deg, #87CEEB, #FFB6C1) !important' }}
                onClick={() => setShareModal(true)}>💌 分享周报</Button>
            </div>
          </div>
          <Row gutter={[8, 8]}>
            {cls.students.map(s => {
              const emotion = s.monitoring?.emotion || 'calm';
              const hr = s.monitoring?.heart_rate || 0;
              const abnormal = hr > 110;
              return (
                <Col span={8} key={s.id}>
                  <div className={`student-card ${abnormal ? 'abnormal' : ''}`}>
                    <div style={{ fontSize: 32 }}>{s.gender === '女' ? '👧' : '👦'}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{s.nickname}</div>
                    <span className="emotion-pill" style={{
                      background: SOFT_EMOTION_BG[emotion],
                      color: SOFT_EMOTION_TEXT[emotion],
                    }}>{EMOTION_LABELS[emotion]}</span>
                    <div style={{ fontSize: 11, color: abnormal ? '#ff7875' : '#bbb', marginTop: 4 }}>
                      ❤️ {hr}bpm
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      ))}

      <Modal title="💌 选择宝宝发送周报" open={shareModal} onCancel={() => setShareModal(false)}
        onOk={async () => {
          await api.shareReport(selectedIds);
          message.success(`已向 ${selectedIds.length} 位家长发送周报 💌`);
          setShareModal(false);
        }}>
        <Checkbox.Group value={selectedIds} onChange={v => setSelectedIds(v as string[])} style={{ width: '100%' }}>
          {allStudents.map(s => (
            <div key={s.id} style={{ marginBottom: 8 }}>
              <Checkbox value={s.id}>{s.gender === '女' ? '👧' : '👦'} {s.nickname}</Checkbox>
            </div>
          ))}
        </Checkbox.Group>
      </Modal>
    </div>
  );
}
