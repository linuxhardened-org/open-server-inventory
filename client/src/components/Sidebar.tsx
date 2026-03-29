import { NavLink, useNavigate } from 'react-router-dom';
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
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/useAuthStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Server, label: 'Servers', path: '/servers' },
  { icon: Layers, label: 'Groups', path: '/groups' },
  { icon: Tag, label: 'Tags', path: '/tags' },
  { icon: Key, label: 'SSH Keys', path: '/ssh-keys' },
  { icon: Users, label: 'Users', path: '/users' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const profileItem = { icon: UserCircle, label: 'Profile', path: '/profile' } as const;

export const Sidebar = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
          <ShieldCheck className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <span className="block text-lg font-bold tracking-tight text-foreground">ServerVault</span>
          <span className="text-xs font-medium text-secondary">Inventory</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-secondary hover:bg-foreground/[0.06] hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to={profileItem.path}
          className={({ isActive }) =>
            cn(
              'mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-secondary hover:bg-foreground/[0.06] hover:text-foreground'
            )
          }
        >
          <profileItem.icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          <span>{profileItem.label}</span>
        </NavLink>
      </nav>

      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
