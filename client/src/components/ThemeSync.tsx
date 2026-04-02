import { useEffect } from 'react';
import { applyDomTheme, initThemeFromStorage, useThemeStore } from '../store/useThemeStore';

/** Apply persisted theme on mount so dark mode survives page refresh. */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  const accent = useThemeStore((s) => s.accent);

  useEffect(() => {
    initThemeFromStorage();
  }, []);

  // Keep DOM theme in sync with store state (including "system")
  useEffect(() => {
    applyDomTheme(theme, accent);
  }, [theme, accent]);

  // React to OS appearance changes while theme mode is "system"
  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyDomTheme('system', accent);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, accent]);

  return null;
}
