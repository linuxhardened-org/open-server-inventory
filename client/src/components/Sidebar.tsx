import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Layers,
  Tag,
  Key,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Database,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

const mainNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', end: true },
  { icon: Server,          label: 'Servers',   path: '/servers',   end: false },
  { icon: Layers,          label: 'Groups',    path: '/groups',    end: false },
  { icon: Tag,             label: 'Tags',      path: '/tags',      end: false },
  { icon: Key,             label: 'SSH Keys',  path: '/ssh-keys',  end: false },
];

const accountNav = [
  { icon: Users,      label: 'Users',    path: '/users',    end: false },
  { icon: UserCircle, label: 'Profile',  path: '/profile',  end: false },
  { icon: Settings,   label: 'Settings', path: '/settings', end: false },
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

  return (
    <nav className={`app-sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <Link to="/dashboard" className="app-sidebar-brand">
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'hsl(var(--primary))',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Database size={14} strokeWidth={2} />
        </span>
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
