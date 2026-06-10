import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function SplashPage() {
  const navigate = useNavigate();
  const { token, onboarded } = useAppStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) navigate(onboarded ? '/' : '/onboarding', { replace: true });
      else navigate(onboarded ? '/login' : '/onboarding', { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [token, onboarded, navigate]);

  return (
    <div className="splash-screen">
      <div className="breathing-logo" style={{ fontSize: 80, marginBottom: 24 }}>🌙</div>
      <h1 style={{ fontSize: 32, fontWeight: 300, color: '#5a9bc4', letterSpacing: 8 }}>童梦AI</h1>
      <p style={{ marginTop: 12, color: '#999', fontSize: 14 }}>儿童无感监测 · 智能助眠安抚</p>
    </div>
  );
}
