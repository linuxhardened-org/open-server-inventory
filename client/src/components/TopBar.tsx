import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggle } from './ThemeToggle';

export const TopBar = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-md md:h-16 md:px-8">
      <div className="relative max-w-xl flex-1">
        <label htmlFor="global-search" className="sr-only">
          Search inventory
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
        <input
          id="global-search"
          type="search"
          placeholder="Search servers, groups, tags…"
          className="h-10 w-full rounded-lg border border-border bg-surface-lighter py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-secondary/80 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
          autoComplete="off"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <button
          type="button"
          className="relative rounded-lg p-2 text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-background bg-primary" aria-hidden />
        </button>

        <div className="hidden h-8 w-px bg-border sm:block" aria-hidden />

        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-foreground/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:gap-3 md:pr-3"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <User className="h-4 w-4 text-primary" aria-hidden />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-foreground">{user?.username ?? 'User'}</span>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-secondary">
              {user?.role ?? 'operator'}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-secondary sm:block" aria-hidden />
        </Link>
      </div>
    </header>
  );
};
