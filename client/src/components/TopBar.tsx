import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const TopBar = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="app-topbar">
      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Link
          to="/profile"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-foreground/[0.05] no-underline"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary font-semibold text-xs uppercase">
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
          <ChevronDown size={14} className="hidden text-secondary sm:block" aria-hidden />
        </Link>
      </div>
    </header>
  );
};
