import { create } from 'zustand';
import api from '../lib/api';

interface SettingsState {
  appName: string;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  setAppName: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appName: 'ServerVault',
  loaded: false,
  fetchSettings: async () => {
    try {
      const res = (await api.get('/settings')) as { success: boolean; data: Record<string, string> };
      if (res?.data?.app_name) {
        set({ appName: res.data.app_name, loaded: true });
      }
    } catch {
      // fallback to default
    }
  },
  setAppName: (name) => set({ appName: name }),
}));
