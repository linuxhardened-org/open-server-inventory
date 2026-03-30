import { Link } from 'react-router-dom';
import { ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

export const TopBar = () => {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="app-topbar">
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>

        {/* Divider */}
        <div className="mx-1.5 h-5 w-px bg-border" />

        {/* User */}
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-foreground/[0.05] no-underline"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/[0.12] text-primary font-semibold text-[11px] uppercase">
            {user?.username?.[0] ?? 'U'}
          </span>
          <span className="hidden sm:block">
            <span className="block text-[13px] font-medium leading-tight text-foreground">
              {user?.username ?? 'User'}
            </span>
            <span className="block text-[11px] capitalize leading-tight text-secondary">
              {user?.role ?? 'operator'}
            </span>
          </span>
          <ChevronDown size={13} className="hidden text-secondary sm:block" aria-hidden />
        </Link>
      </div>
    </header>
  );
};
