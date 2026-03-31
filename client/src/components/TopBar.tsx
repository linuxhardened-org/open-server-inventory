import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, Monitor } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { resolveThemeMode, useThemeStore } from '../store/useThemeStore';

export const TopBar = ({ onMenuToggle }: { onMenuToggle?: () => void }) => {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const resolved = resolveThemeMode(theme);
  const isDark = resolved === 'dark';
  const isSystem = theme === 'system';

  return (
    <header className="app-topbar">
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        style={{ color: 'hsl(var(--fg-2))', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface-3))'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
        aria-label="Toggle navigation"
      >
        <Menu size={18} aria-hidden />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Theme toggle — simple opacity crossfade */}
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label={isDark ? 'Switch theme mode (current dark)' : 'Switch theme mode (current light)'}
          title={isSystem ? 'System mode (click to cycle)' : isDark ? 'Dark mode (click to cycle)' : 'Light mode (click to cycle)'}
        >
          <span className="relative flex items-center justify-center w-[18px] h-[18px]">
            <Sun
              size={15}
              aria-hidden
              className="absolute transition-opacity duration-200"
              style={{ opacity: isSystem ? 0 : isDark ? 1 : 0 }}
            />
            <Moon
              size={15}
              aria-hidden
              className="absolute transition-opacity duration-200"
              style={{ opacity: isSystem ? 0 : isDark ? 0 : 1 }}
            />
            <Monitor
              size={15}
              aria-hidden
              className="absolute transition-opacity duration-200"
              style={{ opacity: isSystem ? 1 : 0 }}
            />
          </span>
        </button>

        {/* Divider */}
        <div
          className="mx-1.5"
          style={{ width: 1, height: 20, background: 'hsl(var(--border-2))' }}
        />

        {/* User chip */}
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 no-underline transition-colors duration-100"
          style={{ color: 'hsl(var(--fg))' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'hsl(var(--surface-3))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'none'; }}
        >
          {/* Avatar */}
          {user?.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt="Profile"
              style={{
                width: 26,
                height: 26,
                borderRadius: '9999px',
                objectFit: 'cover',
                border: '1.5px solid hsl(var(--primary) / 0.3)',
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span
              className="flex items-center justify-center rounded-full uppercase font-medium"
              style={{
                width: 26,
                height: 26,
                fontSize: 11,
                color: 'hsl(var(--primary))',
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))',
                border: '1.5px solid hsl(var(--primary) / 0.3)',
                flexShrink: 0,
              }}
            >
              {user?.username?.[0] ?? 'U'}
            </span>
          )}

          {/* Username + role */}
          <span className="hidden sm:flex flex-col" style={{ overflow: 'hidden', maxWidth: 140 }}>
            <span style={{ fontSize: 13, color: 'hsl(var(--fg))', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.real_name || user?.username || 'User'}
            </span>
            <span className="capitalize" style={{ fontSize: 11, color: 'hsl(var(--fg-2))', lineHeight: 1.3 }}>
              {user?.role ?? 'operator'}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
};
