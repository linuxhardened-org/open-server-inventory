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

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', end: true },
  { icon: Server,          label: 'Servers',   path: '/servers',   end: false },
  { icon: Layers,          label: 'Groups',    path: '/groups',    end: false },
  { icon: Tag,             label: 'Tags',      path: '/tags',      end: false },
  { icon: Key,             label: 'SSH Keys',  path: '/ssh-keys',  end: false },
];

const bottomItems = [
  { icon: Users,      label: 'Users',    path: '/users',    end: false },
  { icon: UserCircle, label: 'Profile',  path: '/profile',  end: false },
  { icon: Settings,   label: 'Settings', path: '/settings', end: false },
];

export const Sidebar = () => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <nav className="app-sidebar">
      {/* Brand */}
      <Link to="/dashboard" className="app-sidebar-brand">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
          <Database size={15} strokeWidth={2.2} />
        </span>
        <span>ServerVault</span>
      </Link>

      {/* Navigation */}
      <div className="app-nav">
        <div className="app-sidebar-section">Main</div>
        <ul className="app-nav-list">
          {navItems.map(({ icon: Icon, label, path, end }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={end}
                className={({ isActive }) =>
                  `app-nav-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="app-sidebar-section mt-4">Account</div>
        <ul className="app-nav-list">
          {bottomItems.map(({ icon: Icon, label, path, end }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={end}
                className={({ isActive }) =>
                  `app-nav-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer / Logout */}
      <div className="app-sidebar-footer">
        <button
          type="button"
          onClick={() => { logout(); navigate('/login'); }}
          className="app-nav-link w-full cursor-pointer border-0 bg-transparent hover:!bg-danger/8 hover:!text-danger"
        >
          <LogOut size={16} strokeWidth={1.8} aria-hidden />
          Sign out
        </button>
      </div>
    </nav>
  );
};
