import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import SplashPage from './pages/SplashPage';
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SoothePage from './pages/SoothePage';
import ReportPage from './pages/ReportPage';
import KnowledgePage from './pages/KnowledgePage';
import ProfilePage from './pages/ProfilePage';
import InstitutionPage from './pages/InstitutionPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminArticles from './pages/admin/AdminArticles';
import AdminDevices from './pages/admin/AdminDevices';
import AppLayout from './layouts/AppLayout';
import { useUpdateCheck } from './hooks/useUpdateCheck';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore(s => s.token);
  useUpdateCheck();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="devices" element={<AdminDevices />} />
          <Route path="articles" element={<AdminArticles />} />
        </Route>
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<HomePage />} />
          <Route path="soothe" element={<SoothePage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="institution" element={<InstitutionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/splash" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
