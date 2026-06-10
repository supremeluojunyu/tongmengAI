import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tongmeng.ai',
  appName: '童梦AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // 部署时改为实际服务器地址，例如: url: 'http://192.168.1.100:9050'
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
