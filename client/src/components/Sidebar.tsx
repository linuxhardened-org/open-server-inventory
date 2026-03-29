import { Link, NavLink, useMatch, useNavigate } from 'react-router-dom';
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
  Hexagon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', end: true },
  { icon: Server, label: 'Servers', path: '/servers', end: false },
  { icon: Layers, label: 'Groups', path: '/groups', end: false },
  { icon: Tag, label: 'Tags', path: '/tags', end: false },
  { icon: Key, label: 'SSH Keys', path: '/ssh-keys', end: false },
  { icon: Users, label: 'Users', path: '/users', end: false },
  { icon: Settings, label: 'Settings', path: '/settings', end: false },
] as const;

const profileItem = { icon: UserCircle, label: 'Profile', path: '/profile', end: false } as const;

function SidebarNavItem({
  path,
  end,
  icon: Icon,
  label,
}: {
  path: string;
  end: boolean;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  const match = useMatch({ path, end });
  const isActive = !!match;

  return (
    <li className={cn('sidebar-item', isActive && 'active')}>
      <NavLink end={end} className="sidebar-link" to={path}>
        <Icon className="align-middle" size={18} strokeWidth={2} aria-hidden />
        <span className="align-middle">{label}</span>
      </NavLink>
    </li>
  );
}

type SidebarProps = {
  collapsed: boolean;
};

export const Sidebar = ({ collapsed }: SidebarProps) => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={cn('sidebar', collapsed && 'collapsed')}>
      <div className="sidebar-content">
        <Link className="sidebar-brand" to="/dashboard">
          <span className="align-middle text-primary">
            <Hexagon className="d-inline-block" size={28} strokeWidth={2} aria-hidden />
          </span>
          <span className="align-middle">ServerVault</span>
        </Link>

        <ul className="sidebar-nav">
          <li className="sidebar-header">Apps</li>
          {navItems.map((item) => (
            <SidebarNavItem key={item.path} {...item} />
          ))}
          <SidebarNavItem {...profileItem} />
        </ul>

        <div className="mt-auto border-top border-secondary border-opacity-25 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
          >
            <LogOut size={18} aria-hidden />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
