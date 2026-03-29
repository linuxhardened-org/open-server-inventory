import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

/** Keeps `document.documentElement` in sync with persisted theme (incl. after rehydration). */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return null;
}
