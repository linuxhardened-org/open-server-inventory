import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

function applyDomTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.setAttribute('data-bs-theme', mode === 'dark' ? 'dark' : 'light');
}

export const useThemeStore = create<{
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}>()(
  persist(
    (set, get) => ({
      theme: 'dark' as ThemeMode,
      setTheme: (theme) => {
        set({ theme });
        applyDomTheme(theme);
      },
      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
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
  try {
    const raw = localStorage.getItem('theme-storage');
    if (!raw) {
      applyDomTheme('dark');
      return;
    }
    const parsed = JSON.parse(raw) as { state?: { theme?: ThemeMode } };
    const t = parsed.state?.theme ?? 'dark';
    applyDomTheme(t);
  } catch {
    applyDomTheme('dark');
  }
}
