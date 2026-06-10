import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Carousel } from 'antd';
import { EyeInvisibleOutlined, SoundOutlined, HeartOutlined } from '@ant-design/icons';
import { useAppStore } from '../stores/appStore';

const slides = [
  { icon: <EyeInvisibleOutlined style={{ fontSize: 48, color: '#7eb8da' }} />, title: '无感监测', desc: '不贴电极、不戴头环，NIRS+PPG 温柔守护' },
  { icon: <SoundOutlined style={{ fontSize: 48, color: '#f4a7b9' }} />, title: '智能安抚', desc: '情绪识别自动哄睡，白噪音与灯光协同' },
  { icon: <HeartOutlined style={{ fontSize: 48, color: '#a8d8a8' }} />, title: '外骨骼省力', desc: '抱睡不累腰，横抱竖抱随心切换' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setOnboarded = useAppStore(s => s.setOnboarded);
  const [step, setStep] = useState(0);

  const finish = () => {
    setOnboarded(true);
    navigate('/login');
  };

  return (
    <div className="splash-screen" style={{ padding: 24 }}>
      <Carousel afterChange={setStep} dots={{ className: 'custom-dots' }}>
        {slides.map((s, i) => (
          <div key={i}>
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: 32 }}>{s.icon}</div>
              <h2 style={{ fontSize: 24, marginBottom: 12, color: '#2c3e50' }}>{s.title}</h2>
              <p style={{ color: '#7f8c8d', fontSize: 16, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </Carousel>
      <div style={{ position: 'fixed', bottom: 40, left: 0, right: 0, textAlign: 'center', padding: '0 24px' }}>
        {step === 2 ? (
          <Button type="primary" size="large" block onClick={finish} style={{ height: 48, borderRadius: 24, background: '#7eb8da' }}>
            开启童梦之旅
          </Button>
        ) : (
          <Button type="link" onClick={finish} style={{ color: '#999' }}>跳过</Button>
        )}
      </div>
    </div>
  );
}
