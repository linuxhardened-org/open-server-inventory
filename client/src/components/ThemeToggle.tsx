import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-surface-lighter text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
