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
  const { theme, accent, setAccent, toggleTheme } = useThemeStore();

  return (
    <nav className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <Link to="/servers" className="app-sidebar-brand">
        {/* Terminal >_ SVG icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            flexShrink: 0,
            filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.6))',
          }}
          aria-hidden
        >
          <rect width="28" height="28" rx="7" fill="hsl(var(--primary) / 0.12)" />
          <text
            x="5"
            y="19"
            fontFamily="'Geist Mono', ui-monospace, monospace"
            fontSize="12"
            fontWeight="600"
            fill="hsl(var(--primary))"
          >
            {'> _'}
          </text>
        </svg>
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
        {/* Dark/Light toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            marginBottom: 10,
            borderRadius: 6,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--surface-2))',
            color: 'hsl(var(--fg-2))',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
          {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        </button>
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
