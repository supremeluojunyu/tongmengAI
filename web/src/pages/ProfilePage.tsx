import { useState, useEffect } from 'react';
import { Card, List, Button, Modal, Form, Input, InputNumber, Select, message, Tag, Switch } from 'antd';
import { PlusOutlined, LogoutOutlined, CustomerServiceOutlined, SettingOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { MEMBERSHIP_LABELS, ROLE_LABELS } from '../types';
import type { Device } from '../types';

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
      const list = await api.getChildren();
      setChildren(list);
      setAddModal(false);
      form.resetFields();
      message.success('儿童信息已添加');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '添加失败');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card className="card-soft" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #7eb8da, #fce4ec)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{user?.name}</div>
            <Tag color="blue">{ROLE_LABELS[user?.role || 'parent']}</Tag>
            <Tag icon={<CrownOutlined />} color="gold">{MEMBERSHIP_LABELS[user?.membership || 'basic']}</Tag>
          </div>
        </div>
        <Button type="primary" ghost size="small" style={{ marginTop: 12 }}>升级会员</Button>
      </Card>

      <Card className="card-soft" title="👶 儿童管理" size="small" style={{ marginBottom: 12 }}
        extra={<Button type="link" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>添加</Button>}>
        <List size="small" dataSource={children} renderItem={c => (
          <List.Item>
            <span>{c.nickname} · {c.age}岁 · {c.gender}</span>
            {c.special_needs && <Tag color="orange">{c.special_needs}</Tag>}
          </List.Item>
        )} />
      </Card>

      <Card className="card-soft" title="📡 设备管理" size="small" style={{ marginBottom: 12 }}>
        <List size="small" dataSource={devices} renderItem={d => (
          <List.Item>
            <span>{d.name} ({d.type})</span>
            <Tag color={d.status === 'online' ? 'green' : 'default'}>{d.status === 'online' ? '在线' : '离线'} {d.battery}%</Tag>
          </List.Item>
        )} />
      </Card>

      <Card className="card-soft" size="small" style={{ marginBottom: 12 }}>
        <List size="small">
          <List.Item><CustomerServiceOutlined /> 在线客服</List.Item>
          <List.Item>📞 400-888-6688</List.Item>
          <List.Item><SettingOutlined /> 通知开关 <Switch defaultChecked size="small" style={{ float: 'right' }} /></List.Item>
          <List.Item>🎤 语音唤醒 <Switch size="small" style={{ float: 'right' }} /></List.Item>
          <List.Item style={{ cursor: 'pointer' }} onClick={() => window.open('/download', '_blank')}>📱 下载 Android APP</List.Item>
          {user?.role === 'admin' && (
            <List.Item style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>⚙️ 管理后台</List.Item>
          )}
        </List>
      </Card>

      <Button danger icon={<LogoutOutlined />} block onClick={() => { logout(); navigate('/login'); }} style={{ borderRadius: 20 }}>退出登录</Button>

      <Modal title="添加儿童" open={addModal} onCancel={() => setAddModal(false)} onOk={() => form.submit()} okText="保存">
        <Form form={form} layout="vertical" onFinish={addChild}>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="age" label="年龄" rules={[{ required: true }]}><InputNumber min={0} max={6} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="gender" label="性别" rules={[{ required: true }]}>
            <Select options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} />
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
