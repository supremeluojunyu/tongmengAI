import { create } from 'zustand';
import type { User, Child } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  currentChild: Child | null;
  children: Child[];
  onboarded: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setChildren: (children: Child[]) => void;
  setCurrentChild: (child: Child | null) => void;
  setOnboarded: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: JSON.parse(localStorage.getItem('tm_user') || 'null'),
  token: localStorage.getItem('tm_token'),
  currentChild: JSON.parse(localStorage.getItem('tm_current_child') || 'null'),
  children: [],
  onboarded: localStorage.getItem('tm_onboarded') === '1',
  setAuth: (token, user) => {
    localStorage.setItem('tm_token', token);
    localStorage.setItem('tm_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
    localStorage.removeItem('tm_current_child');
    set({ token: null, user: null, currentChild: null, children: [] });
  },
  setChildren: (children) => set({ children }),
  setCurrentChild: (child) => {
    if (child) localStorage.setItem('tm_current_child', JSON.stringify(child));
    else localStorage.removeItem('tm_current_child');
    set({ currentChild: child });
  },
  setOnboarded: (v) => {
    localStorage.setItem('tm_onboarded', v ? '1' : '0');
    set({ onboarded: v });
  },
}));
