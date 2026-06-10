import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Tabs, Select, message, Card } from 'antd';
import { MobileOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { useAppStore } from '../stores/appStore';
import { ROLE_LABELS } from '../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore(s => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('login');

  const onLogin = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const { token, user } = await api.login(values.phone, values.password);
      setAuth(token, user);
      message.success(`欢迎回来，${user.name}`);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: { phone: string; password: string; name: string; role: string }) => {
    setLoading(true);
    try {
      const { token, user } = await api.register(values);
      setAuth(token, user);
      message.success('注册成功');
      navigate('/');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="splash-screen" style={{ padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48 }}>🌙</div>
        <h1 style={{ fontSize: 28, color: '#5a9bc4', marginTop: 8 }}>童梦AI</h1>
      </div>

      <Card className="card-soft" style={{ width: '100%', maxWidth: 400 }}>
        <Tabs activeKey={tab} onChange={setTab} centered items={[
          { key: 'login', label: '登录' },
          { key: 'register', label: '注册' },
        ]} />

        {tab === 'login' ? (
          <Form onFinish={onLogin} size="large" initialValues={{ phone: '13800000001', password: '123456' }}>
            <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
              <Input prefix={<MobileOutlined />} placeholder="手机号" maxLength={11} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, borderRadius: 22, background: '#7eb8da' }}>
                登录
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form onFinish={onRegister} size="large">
            <Form.Item name="name" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} placeholder="姓名" />
            </Form.Item>
            <Form.Item name="phone" rules={[{ required: true }]}>
              <Input prefix={<MobileOutlined />} placeholder="手机号" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码（至少6位）" />
            </Form.Item>
            <Form.Item name="role" initialValue="parent">
              <Select options={Object.entries(ROLE_LABELS).filter(([k]) => k !== 'admin').map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, borderRadius: 22, background: '#7eb8da' }}>
                注册
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 16 }}>
          演示账号：13800000001/123456（家长）· 13800000002/123456（教师）
        </div>
      </Card>
    </div>
  );
}
