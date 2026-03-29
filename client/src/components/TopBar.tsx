import { Search, Bell, User, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggle } from './ThemeToggle';

type TopBarProps = {
  onMenuClick: () => void;
};

export const TopBar = ({ onMenuClick }: TopBarProps) => {
  const user = useAuthStore((state) => state.user);

  return (
    <nav className="navbar navbar-expand navbar-light navbar-bg px-3 px-lg-4" aria-label="Top">
      <button
        type="button"
        className="sidebar-toggle btn btn-link text-secondary border-0 p-0 shadow-none"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger align-self-center" />
      </button>

      <div className="navbar-collapse collapse show flex-grow-1 align-items-center">
        <div className="position-relative flex-grow-1 mx-2 mx-md-4" style={{ maxWidth: 480 }}>
          <label htmlFor="global-search" className="visually-hidden">
            Search inventory
          </label>
          <Search
            className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"
            size={18}
            aria-hidden
          />
          <input
            id="global-search"
            type="search"
            placeholder="Search servers, groups, tags…"
            className="form-control ps-5 rounded-pill"
            autoComplete="off"
          />
        </div>

        <div className="navbar-nav ms-auto flex-row align-items-center gap-1 gap-md-2">
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-link text-secondary position-relative p-2 rounded-circle"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span
              className="position-absolute top-0 end-0 translate-middle p-1 bg-primary border border-light rounded-circle"
              style={{ width: 8, height: 8 }}
              aria-hidden
            />
          </button>

          <div className="vr mx-1 d-none d-sm-block text-secondary opacity-25" />

          <Link
            to="/profile"
            className="nav-link d-flex align-items-center gap-2 py-1 px-2 rounded-pill text-decoration-none text-body"
          >
            <span className="rounded-circle bg-primary bg-opacity-10 p-2 text-primary d-inline-flex">
              <User size={18} aria-hidden />
            </span>
            <span className="d-none d-sm-block text-start">
              <span className="d-block small fw-semibold lh-1">{user?.username ?? 'User'}</span>
              <span className="d-block text-secondary text-capitalize" style={{ fontSize: 11 }}>
                {user?.role ?? 'operator'}
              </span>
            </span>
            <ChevronDown size={16} className="text-secondary d-none d-sm-block" aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
};
