import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Server,
  Layers,
  Tag,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Key,
  Cloud,
  Network,
  Palette,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useThemeStore, accentColors } from '../store/useThemeStore';

const mainNav = [
  { icon: Server, label: 'Servers', path: '/servers', end: false },
  { icon: Network, label: 'IPs', path: '/ips', end: false },
  { icon: Layers, label: 'Groups',  path: '/groups',  end: false },
  { icon: Tag,    label: 'Tags',    path: '/tags',    end: false },
  { icon: Cloud,  label: 'Cloud',   path: '/cloud',   end: false },
];

const accountNav = [
  { icon: Users,      label: 'Users',       path: '/users',        end: false },
  { icon: Key,        label: 'API Settings', path: '/api-settings', end: false },
  { icon: UserCircle, label: 'Profile',     path: '/profile',      end: false },
  { icon: Settings,   label: 'Settings',    path: '/settings',     end: false },
];

function NavItem({ icon: Icon, label, path, end }: { icon: typeof Server; label: string; path: string; end: boolean }) {
  return (
    <li>
      <NavLink
        to={path}
        end={end}
        className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
      >
        <Icon size={15} strokeWidth={1.75} aria-hidden />
        {label}
      </NavLink>
    </li>
  );
}

export const Sidebar = ({ isOpen }: { isOpen?: boolean; onClose?: () => void }) => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const appName = useSettingsStore((s) => s.appName);
  const appLogoUrl = useSettingsStore((s) => s.appLogoUrl);
  const { theme, accent, setAccent, setTheme } = useThemeStore();

  return (
    <nav className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <Link to="/servers" className="app-sidebar-brand">
        {appLogoUrl ? (
          <img
            src={appLogoUrl}
            alt="App logo"
            style={{
              width: 28,
              height: 28,
              objectFit: 'contain',
              borderRadius: 6,
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        {appName}
      </Link>

      <div className="app-nav">
        <div className="app-nav-group">Inventory</div>
        <ul className="app-nav-list">
          {mainNav.map((item) => <NavItem key={item.path} {...item} />)}
        </ul>

        <div className="app-nav-group" style={{ marginTop: 8 }}>Account</div>
        <ul className="app-nav-list">
          {accountNav.map((item) => <NavItem key={item.path} {...item} />)}
        </ul>
      </div>

      {/* Theme section */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
          <Palette size={13} style={{ color: 'hsl(var(--fg-3))' }} />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--fg-3))' }}>
            Theme
          </span>
        </div>
        {/* Light / Dark / System selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setTheme('light')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: theme === 'light' ? 'hsl(var(--primary) / 0.14)' : 'hsl(var(--surface-2))',
              color: theme === 'light' ? 'hsl(var(--fg))' : 'hsl(var(--fg-2))',
              fontSize: 11,
              cursor: 'pointer',
            }}
            title="Light theme"
          >
            <Sun size={12} />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: theme === 'dark' ? 'hsl(var(--primary) / 0.14)' : 'hsl(var(--surface-2))',
              color: theme === 'dark' ? 'hsl(var(--fg))' : 'hsl(var(--fg-2))',
              fontSize: 11,
              cursor: 'pointer',
            }}
            title="Dark theme"
          >
            <Moon size={12} />
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme('system')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid hsl(var(--border))',
              background: theme === 'system' ? 'hsl(var(--primary) / 0.14)' : 'hsl(var(--surface-2))',
              color: theme === 'system' ? 'hsl(var(--fg))' : 'hsl(var(--fg-2))',
              fontSize: 11,
              cursor: 'pointer',
            }}
            title="Use system preference"
          >
            <Monitor size={12} />
            System
          </button>
        </div>
        {/* Accent colors */}
        <div className="flex flex-wrap gap-2">
          {accentColors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setAccent(c.id)}
              title={c.label}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: c.color,
                border: accent === c.id ? '2px solid hsl(var(--fg))' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'transform 100ms, border-color 100ms',
                transform: accent === c.id ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="app-sidebar-footer">
        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className="app-nav-link"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--danger))';
            (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--danger) / 0.07)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '';
            (e.currentTarget as HTMLButtonElement).style.background = '';
          }}
        >
          <LogOut size={15} strokeWidth={1.75} aria-hidden />
          Sign out
        </button>
      </div>
    </nav>
  );
};
