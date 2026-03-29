import { useEffect } from 'react';

/** Force single light paper theme globally. */
export function ThemeSync() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.setAttribute('data-bs-theme', 'light');
  }, []);

  return null;
}
