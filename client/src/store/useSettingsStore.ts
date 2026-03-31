import { create } from 'zustand';
import api from '../lib/api';

interface SettingsState {
  appName: string;
  appLogoUrl: string;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  setAppName: (name: string) => void;
  setAppLogoUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appName: 'ServerVault',
  appLogoUrl: '',
  loaded: false,
  fetchSettings: async () => {
    try {
      const res = (await api.get('/settings')) as { success: boolean; data: Record<string, string> };
      set({
        appName: res?.data?.app_name?.trim() || 'ServerVault',
        appLogoUrl: res?.data?.app_logo_url?.trim() || '',
        loaded: true,
      });
    } catch {
      // fallback to default
    }
  },
  setAppName: (name) => set({ appName: name }),
  setAppLogoUrl: (url) => set({ appLogoUrl: url }),
}));
