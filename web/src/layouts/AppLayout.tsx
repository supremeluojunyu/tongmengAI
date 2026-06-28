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

const NAV_TITLES: Record<string, string> = {
  '/soothe': '🎵 安抚宝宝',
  '/report': '📊 成长报告',
  '/knowledge': '📚 育儿知识',
  '/profile': '👤 个人中心',
  '/institution': '🏫 班级看板',
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore(s => s.user);
  const currentChild = useAppStore(s => s.currentChild);
  const isInstitution = user?.role === 'teacher' || user?.role === 'org_admin';

  const allTabs = isInstitution
    ? [...tabs.slice(0, 4), instTab, tabs[4]]
    : tabs;

  const showTopNav = location.pathname !== '/' && !!NAV_TITLES[location.pathname];
  const navTitle = location.pathname === '/report' && currentChild
    ? `📊 ${currentChild.nickname}的报告`
    : NAV_TITLES[location.pathname] || '';

  return (
    <div className="page-container">
      {showTopNav && (
        <div className="top-nav-bar">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="返回">
            ◀
          </button>
          <div className="top-nav-title">{navTitle}</div>
          <div className="top-nav-right" />
        </div>
      )}
      <div className={`content-with-nav${showTopNav ? ' has-top-bar' : ''}`}>
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
