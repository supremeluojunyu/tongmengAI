/** 服务端地址：Web 开发走 Vite 代理用空字符串，APK/生产填完整 URL */
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export const API_BASE = SERVER_URL ? `${SERVER_URL}/api` : '/api';

export function wsUrl() {
  if (SERVER_URL) {
    const u = new URL(SERVER_URL);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws';
    return u.toString();
  }
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}
