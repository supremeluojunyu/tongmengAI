import { useState, useEffect } from 'react';
import { Card, Button, Tag, message, Modal, Checkbox, Row, Col, Badge } from 'antd';
import { AlertOutlined, SoundOutlined, ShareAltOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { EMOTION_COLORS, EMOTION_LABELS } from '../types';

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

  const batchSoothe = async (classId: string) => {
    try {
      const res = await api.batchSoothe(classId) as { message: string };
      message.success(res.message);
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const allStudents = classes.flatMap(c => c.students);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 16, fontWeight: 500 }}>🏫 班级看板</h2>

      {alerts.length > 0 && (
        <Card className="card-soft" style={{ marginBottom: 12, borderColor: '#ff4d4f' }} size="small">
          {alerts.slice(0, 3).map(a => (
            <div key={a.id} style={{ color: '#ff4d4f', marginBottom: 4 }}>
              <AlertOutlined /> {a.nickname}: {a.message}
            </div>
          ))}
        </Card>
      )}

      {classes.map(cls => (
        <Card key={cls.id} className="card-soft" title={cls.name} size="small" style={{ marginBottom: 16 }}
          extra={
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" icon={<SoundOutlined />} onClick={() => batchSoothe(cls.id)}>批量安抚</Button>
              <Button size="small" icon={<ShareAltOutlined />} onClick={() => setShareModal(true)}>分享周报</Button>
            </div>
          }>
          <Row gutter={[8, 8]}>
            {cls.students.map(s => {
              const emotion = s.monitoring?.emotion || 'calm';
              const hr = s.monitoring?.heart_rate || 0;
              const abnormal = hr > 110;
              return (
                <Col span={8} key={s.id}>
                  <div className="card-soft" style={{ padding: 10, textAlign: 'center', border: abnormal ? '2px solid #ff4d4f' : undefined }}>
                    <Badge dot={abnormal} color="red">
                      <div style={{ fontSize: 24 }}>{s.gender === '女' ? '👧' : '👦'}</div>
                    </Badge>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.nickname}</div>
                    <Tag color={EMOTION_COLORS[emotion]} style={{ fontSize: 10 }}>{EMOTION_LABELS[emotion]}</Tag>
                    <div style={{ fontSize: 11, color: abnormal ? '#ff4d4f' : '#999' }}>{hr}bpm</div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>
      ))}

      <Modal title="选择学生发送周报" open={shareModal} onCancel={() => setShareModal(false)}
        onOk={async () => {
          await api.shareReport(selectedIds);
          message.success(`已向 ${selectedIds.length} 位家长发送周报`);
          setShareModal(false);
        }}>
        <Checkbox.Group value={selectedIds} onChange={v => setSelectedIds(v as string[])} style={{ width: '100%' }}>
          {allStudents.map(s => (
            <div key={s.id} style={{ marginBottom: 8 }}><Checkbox value={s.id}>{s.nickname}</Checkbox></div>
          ))}
        </Checkbox.Group>
      </Modal>
    </div>
  );
}
