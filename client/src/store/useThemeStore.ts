import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

function applyDomTheme(_mode: ThemeMode) {
  const root = document.documentElement;
  // Theme is locked to light paper mode.
  root.classList.remove('dark');
  root.setAttribute('data-bs-theme', 'light');
}

export const useThemeStore = create<{
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}>()(
  persist(
    (set, get) => ({
      theme: 'light' as ThemeMode,
      setTheme: (_theme) => {
        set({ theme: 'light' });
        applyDomTheme('light');
      },
      toggleTheme: () => {
        get().setTheme('light');
      },
    }),
    {
      name: 'theme-storage',
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyDomTheme(state.theme);
      },
    }
  )
);

/** Call once on app load (before paint handled by index.html script). */
export function initThemeFromStorage() {
  applyDomTheme('light');
}
