import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, SoundOutlined, BarChartOutlined, ReadOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useAppStore } from '../stores/appStore';

const tabs = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/soothe', icon: <SoundOutlined />, label: '安抚' },
  { key: '/report', icon: <BarChartOutlined />, label: '报告' },
  { key: '/knowledge', icon: <ReadOutlined />, label: '育儿' },
  { key: '/profile', icon: <UserOutlined />, label: '我的' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore(s => s.user);
  const isInstitution = user?.role === 'teacher' || user?.role === 'org_admin';

  const allTabs = isInstitution
    ? [...tabs.slice(0, 4), { key: '/institution', icon: <TeamOutlined />, label: '班级' }, tabs[4]]
    : tabs;

  return (
    <div className="page-container">
      <div className="content-with-nav">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {allTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => navigate(tab.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                color: location.pathname === tab.key ? '#7eb8da' : '#999',
                display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 11,
              }}
            >
              <span style={{ fontSize: 22 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
