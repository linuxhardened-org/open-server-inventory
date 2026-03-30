import { useEffect } from 'react';
import { initThemeFromStorage } from '../store/useThemeStore';

/** Apply persisted theme on mount so dark mode survives page refresh. */
export function ThemeSync() {
  useEffect(() => {
    initThemeFromStorage();
  }, []);

  return null;
}
