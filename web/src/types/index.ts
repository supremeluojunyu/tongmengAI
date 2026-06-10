export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'parent' | 'teacher' | 'org_admin' | 'admin';
  membership: string;
  avatar?: string;
  org_id?: string;
}

export interface Child {
  id: string;
  user_id: string;
  nickname: string;
  age: number;
  gender: string;
  special_needs?: string;
  class_id?: string;
}

export interface MonitoringData {
  child_id: string;
  emotion: string;
  sleep_stage: string;
  heart_rate: number;
  breath_rate: number;
  body_movement: number;
  exoskeleton_mode?: string;
  exoskeleton_force?: string;
  exoskeleton_battery?: number;
  recorded_at: string;
  emotionInfo?: { label: string; color: string };
  sleepStageLabel?: string;
  devices?: Device[];
}

export interface Device {
  id: string;
  name: string;
  type: string;
  battery: number;
  status: string;
  child_id?: string;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  age_group: string;
  special_type?: string;
  content: string;
  video_url?: string;
  is_premium: number;
  views: number;
}

export interface SootheRecord {
  id: string;
  trigger_type: string;
  sound_type?: string;
  posture?: string;
  force_level?: string;
  duration_min?: number;
  effect_minutes_saved?: number;
  started_at: string;
  ended_at?: string;
}

export const MEMBERSHIP_LABELS: Record<string, string> = {
  basic: '基础会员',
  family_premium: '家庭高级会员',
  special_pro: '特殊儿童专业会员',
  institution: '机构企业会员',
};

export const ROLE_LABELS: Record<string, string> = {
  parent: '家长',
  teacher: '幼师',
  org_admin: '机构管理员',
  admin: '系统管理员',
};

export const EMOTION_COLORS: Record<string, string> = {
  excited: '#ff4d4f',
  irritable: '#fa8c16',
  calm: '#52c41a',
  sleepy: '#1890ff',
  tense: '#eb2f96',
};

export const EMOTION_LABELS: Record<string, string> = {
  excited: '兴奋',
  irritable: '烦躁',
  calm: '平静',
  sleepy: '困倦',
  tense: '紧张',
};
