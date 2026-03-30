import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

export function applyDomTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<{
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}>()(
  persist(
    (set, get) => ({
      theme: 'light' as ThemeMode,
      setTheme: (theme) => {
        set({ theme });
        applyDomTheme(theme);
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
    }),
    {
      name: 'sv-theme',
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyDomTheme(state.theme);
      },
    }
  )
);

export function initThemeFromStorage() {
  try {
    const raw = localStorage.getItem('sv-theme');
    const parsed = raw ? JSON.parse(raw) : null;
    applyDomTheme(parsed?.state?.theme === 'dark' ? 'dark' : 'light');
  } catch {
    applyDomTheme('light');
  }
}
