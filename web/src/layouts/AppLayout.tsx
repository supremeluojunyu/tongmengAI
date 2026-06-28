import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

const tabs = [
  { key: '/', emoji: '🏠', label: '首页' },
  { key: '/soothe', emoji: '🎵', label: '安抚' },
  { key: '/report', emoji: '📊', label: '报告' },
  { key: '/knowledge', emoji: '📚', label: '育儿' },
  { key: '/profile', emoji: '👤', label: '我的' },
];

const instTab = { key: '/institution', emoji: '🏫', label: '班级' };

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore(s => s.user);
  const isInstitution = user?.role === 'teacher' || user?.role === 'org_admin';

  const allTabs = isInstitution
    ? [...tabs.slice(0, 4), instTab, tabs[4]]
    : tabs;

  return (
    <div className="page-container">
      <div className="content-with-nav">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <div className="nav-row">
          {allTabs.map(tab => {
            const active = location.pathname === tab.key;
            return (
              <button
                key={tab.key}
                className={`nav-btn ${active ? 'active' : ''}`}
                onClick={() => navigate(tab.key)}
              >
                <span className="nav-icon">{tab.emoji}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
