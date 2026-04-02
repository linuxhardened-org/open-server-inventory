import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'emerald' | 'blue' | 'purple' | 'orange' | 'pink' | 'cyan';

export const accentColors: { id: AccentColor; label: string; color: string }[] = [
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'purple', label: 'Purple', color: '#8b5cf6' },
  { id: 'orange', label: 'Orange', color: '#f97316' },
  { id: 'pink', label: 'Pink', color: '#ec4899' },
  { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
];

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? 'dark' : 'light';
}

export function applyDomTheme(mode: ThemeMode, accent: AccentColor = 'emerald') {
  const root = document.documentElement;
  const resolved = resolveThemeMode(mode);
  
  // Update class on <html>
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Remove all accent classes and add the selected one
  accentColors.forEach(c => root.classList.remove(`accent-${c.id}`));
  root.classList.add(`accent-${accent}`);
}

export const useThemeStore = create<{
  theme: ThemeMode;
  accent: AccentColor;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  toggleTheme: () => void;
}>()(
  persist(
    (set, get) => ({
      theme: 'light' as ThemeMode,
      accent: 'emerald' as AccentColor,
      setTheme: (theme) => {
        set({ theme });
        applyDomTheme(theme, get().accent);
      },
      setAccent: (accent) => {
        set({ accent });
        applyDomTheme(get().theme, accent);
      },
      toggleTheme: () => {
        const t = get().theme;
        // If system, resolve current and toggle to opposite. 
        // Header toggle only switches between explicit light/dark.
        const resolved = resolveThemeMode(t);
        const next: ThemeMode = resolved === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
    }),
    {
      name: 'sv-theme',
      partialize: (s) => ({ theme: s.theme, accent: s.accent }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDomTheme(state.theme || 'light', state.accent || 'emerald');
      },
    }
  )
);

export function initThemeFromStorage() {
  try {
    const raw = localStorage.getItem('sv-theme');
    const parsed = raw ? JSON.parse(raw) : null;
    const stored = parsed?.state?.theme;
    const theme: ThemeMode = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'light';
    const accent = parsed?.state?.accent || 'emerald';
    applyDomTheme(theme, accent);
  } catch {
    applyDomTheme('light', 'emerald');
  }
}
