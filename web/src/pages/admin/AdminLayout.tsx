import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined, UserOutlined, MobileOutlined, ReadOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/appStore';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: '数据概览' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/admin/devices', icon: <MobileOutlined />, label: '设备管理' },
  { key: '/admin/articles', icon: <ReadOutlined />, label: '内容管理' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore(s => s.user);

  return (
    <Layout style={{ minHeight: '100vh' }} className="admin-layout">
      <Sider breakpoint="lg" collapsedWidth={0} theme="dark">
        <div style={{ padding: 16, color: '#fff', fontSize: 18, textAlign: 'center' }}>🌙 童梦AI 管理</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems}
          onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>欢迎，{user?.name}</span>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回用户端</Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
