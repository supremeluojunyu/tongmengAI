import type { User, Child, Device, MonitoringData, SootheRecord, Article } from '../types';
import { API_BASE, wsUrl, SERVER_URL } from '../config/env';

function getToken() {
  return localStorage.getItem('tm_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      text.startsWith('<!')
        ? `无法连接服务器，请检查网络或服务地址（当前: ${API_BASE}）`
        : `服务器返回异常: ${text.slice(0, 80)}`
    );
  }
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export interface ReportData {
  summary: {
    totalSleepHours: string;
    deepSleepRatio: number;
    nightWakeCount: number;
    avgHeartRate: number;
  };
  trend: { time: string; heartRate: number }[];
  emotionHeatmap: { hour: number; emotion: string }[];
  suggestions: string[];
}

export const api = {
  login: (phone: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ phone, password }),
    }),
  register: (data: { phone: string; password: string; name: string; role: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    }),
  me: () => request<User>('/auth/me'),
  getChildren: () => request<Child[]>('/children'),
  addChild: (data: Partial<Child>) =>
    request('/children', { method: 'POST', body: JSON.stringify(data) }),
  getDevices: () => request<Device[]>('/devices'),
  getMonitoring: (childId: string) => request<MonitoringData>(`/monitoring/${childId}/current`),
  getHistory: (childId: string, hours = 24) =>
    request<MonitoringData[]>(`/monitoring/${childId}/history?hours=${hours}`),
  getReport: (childId: string, period = 'day') =>
    request<ReportData>(`/monitoring/${childId}/report?period=${period}`),
  startSoothe: (data: Record<string, unknown>) =>
    request<{ id: string }>('/soothe/start', { method: 'POST', body: JSON.stringify(data) }),
  stopSoothe: (recordId: string, effectMinutesSaved?: number) =>
    request('/soothe/stop', { method: 'POST', body: JSON.stringify({ recordId, effectMinutesSaved }) }),
  setExoskeleton: (data: { childId: string; mode: string; forceLevel: string }) =>
    request('/soothe/exoskeleton', { method: 'POST', body: JSON.stringify(data) }),
  getSootheRecords: (childId: string) =>
    request<SootheRecord[]>(`/soothe/${childId}`),
  getArticles: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Article[]>(`/articles${q}`);
  },
  getArticle: (id: string) => request<Article>(`/articles/${id}`),
  getInstitutionDashboard: () => request<unknown[]>('/institution/dashboard'),
  getAlerts: () => request<unknown[]>('/institution/alerts'),
  batchSoothe: (classId: string) =>
    request<{ message: string }>('/institution/batch-soothe', { method: 'POST', body: JSON.stringify({ classId }) }),
  shareReport: (childIds: string[]) =>
    request('/institution/share-report', { method: 'POST', body: JSON.stringify({ childIds }) }),
  adminStats: () => request<{ users: number; children: number; devices: number; articles: number; alerts: number }>('/admin/stats'),
  adminUsers: () => request<Record<string, unknown>[]>('/admin/users'),
  adminDevices: () => request<Record<string, unknown>[]>('/admin/devices'),
  adminArticles: () => request<Record<string, unknown>[]>('/admin/articles'),
  createArticle: (data: Record<string, unknown>) =>
    request('/admin/articles', { method: 'POST', body: JSON.stringify(data) }),
  deleteArticle: (id: string) =>
    request(`/admin/articles/${id}`, { method: 'DELETE' }),
  startSimulator: () =>
    request<{ ok: boolean; running: boolean; message?: string }>('/simulator/start', {
      method: 'POST', body: JSON.stringify({ intervalMs: 5000 }),
    }),
  stopSimulator: () =>
    request<{ ok: boolean; running: boolean; message?: string }>('/simulator/stop', { method: 'POST' }),
  getSimulatorStatus: () =>
    request<{ running: boolean; tickCount: number; childCount: number; uptimeMs: number }>('/simulator/status'),
};

export function connectWebSocket(onMessage: (data: unknown) => void) {
  const ws = new WebSocket(wsUrl());
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch { /* ignore */ }
  };
  return ws;
}

export { API_BASE, SERVER_URL };
