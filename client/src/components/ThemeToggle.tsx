import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore, resolveThemeMode } from '../store/useThemeStore';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const resolved = resolveThemeMode(theme);
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-secondary transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'system' ? (
        <Monitor size={18} aria-hidden />
      ) : isDark ? (
        <Sun size={18} aria-hidden />
      ) : (
        <Moon size={18} aria-hidden />
      )}
    </button>
  );
}
