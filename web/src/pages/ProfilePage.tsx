import { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, InputNumber, Select, message, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { MEMBERSHIP_LABELS, ROLE_LABELS } from '../types';
import type { Device } from '../types';

const DEVICE_EMOJI: Record<string, string> = { nirs: '🧠', ppg: '💓', exoskeleton: '🤱' };

function batteryGrad(p: number) {
  if (p > 60) return 'linear-gradient(90deg, #a8e6cf, #52c41a)';
  if (p > 30) return 'linear-gradient(90deg, #ffd666, #faad14)';
  return 'linear-gradient(90deg, #ffccc7, #ff7875)';
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, children, logout, setChildren } = useAppStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    api.getDevices().then(setDevices).catch(() => {});
    api.getChildren().then(setChildren).catch(() => {});
  }, [setChildren]);

  const addChild = async (values: Record<string, unknown>) => {
    try {
      await api.addChild(values);
      setChildren(await api.getChildren());
      setAddModal(false);
      form.resetFields();
      message.success('宝宝信息已添加 🎉');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '添加失败');
    }
  };

  const menuItems = [
    { icon: '💬', label: '在线客服', action: () => {} },
    { icon: '📞', label: '400-888-6688', action: () => {} },
    { icon: '🔔', label: '通知开关', switch: true, defaultChecked: true },
    { icon: '🎤', label: '语音唤醒', switch: true },
    { icon: '📱', label: '下载 Android APP', action: () => window.open('/download', '_blank') },
    ...(user?.role === 'admin' ? [{ icon: '⚙️', label: '管理后台', action: () => navigate('/admin') }] : []),
  ];

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div className="section-card slide-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="profile-avatar">👤</div>
          <div>
            <div className="profile-name">{user?.name}</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {ROLE_LABELS[user?.role || 'parent']}
            </span>
            <div style={{ marginTop: 6 }}>
              <span className="member-tag">👑 {MEMBERSHIP_LABELS[user?.membership || 'basic']}</span>
            </div>
          </div>
        </div>
        <Button style={{ marginTop: 14, borderRadius: 16, border: 'none', background: 'var(--gradient-main)', color: '#fff' }} size="small">
          ✨ 升级会员
        </Button>
      </div>

      <div className="section-card slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="section-card-title" style={{ margin: 0 }}>👶 宝宝管理</div>
          <Button type="link" icon={<PlusOutlined />} onClick={() => setAddModal(true)} style={{ color: '#d4738a' }}>添加</Button>
        </div>
        {children.map(c => (
          <div key={c.id} className="child-item">
            <span className="child-emoji">{c.gender === '女' ? '👧' : '👦'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{c.nickname}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.age}岁 · {c.gender}</div>
            </div>
            {c.special_needs && (
              <span className="pill-tag orange">{c.special_needs}</span>
            )}
          </div>
        ))}
      </div>

      <div className="section-card slide-up">
        <div className="section-card-title">📡 设备管理</div>
        {devices.map(d => (
          <div key={d.id} className="child-item">
            <span className="child-emoji">{DEVICE_EMOJI[d.type] || '📟'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{d.name}</div>
              <div className="device-battery-bar" style={{ marginTop: 6 }}>
                <div className="device-battery-fill" style={{ width: `${d.battery}%`, background: batteryGrad(d.battery) }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              {d.status === 'online' ? <span className="online-dot" /> : <span className="offline-dot" />}
              {d.battery}%
            </div>
          </div>
        ))}
      </div>

      <div className="section-card slide-up">
        {menuItems.map((item, i) => (
          <div key={i} className="menu-item" onClick={item.action}>
            <span className="menu-item-icon">{item.icon}</span>
            <span className="menu-item-label">{item.label}</span>
            {'switch' in item && item.switch
              ? <span onClick={e => e.stopPropagation()}><Switch defaultChecked={item.defaultChecked} size="small" /></span>
              : <span className="menu-item-arrow">›</span>}
          </div>
        ))}
      </div>

      <Button block onClick={() => { logout(); navigate('/login'); }}
        style={{ borderRadius: 20, height: 44, color: '#ff7875', borderColor: '#ffccc7' }}>
        👋 退出登录
      </Button>

      <Modal title="添加宝宝" open={addModal} onCancel={() => setAddModal(false)} onOk={() => form.submit()} okText="保存">
        <Form form={form} layout="vertical" onFinish={addChild}>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="age" label="年龄" rules={[{ required: true }]}><InputNumber min={0} max={6} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
            <Select options={[{ value: '男', label: '👦 男' }, { value: '女', label: '👧 女' }]} />
          </Form.Item>
          <Form.Item name="specialNeeds" label="特殊需要">
            <Select allowClear options={[
              { value: '自闭症', label: '自闭症' }, { value: '多动症', label: '多动症' }, { value: '发育迟缓', label: '发育迟缓' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
