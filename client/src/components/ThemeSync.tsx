import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

/** Keeps `document.documentElement` in sync with persisted theme (incl. after rehydration). */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-bs-theme', theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  return null;
}
