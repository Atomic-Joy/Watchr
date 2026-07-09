import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { Home, Search, BarChart2, LogOut } from 'lucide-react';

export function Layout() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brutal-black flex items-center justify-center">
        <div className="text-brutal-red text-2xl font-bold tracking-widest uppercase animate-brutal-pulse">
          LOADING
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-brutal-black text-brutal-white font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-brutal-black border-b-2 border-brutal-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 group">
              <span className="text-2xl font-bold tracking-tighter text-brutal-red">
                WATCHR
              </span>
              <span className="hidden sm:block text-[10px] text-brutal-gray uppercase tracking-[0.3em] mt-1">
                track everything
              </span>
            </NavLink>

            {/* Nav Links */}
            <nav className="flex items-center gap-0">
              <NavItem to="/" icon={<Home className="w-4 h-4" />} label="Home" />
              <NavItem to="/search" icon={<Search className="w-4 h-4" />} label="Search" />
              <NavItem to="/stats" icon={<BarChart2 className="w-4 h-4" />} label="Stats" />
              
              <div className="w-px h-8 bg-brutal-border mx-2"></div>
              
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-brutal-gray hover:text-brutal-red text-xs uppercase tracking-widest font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-brutal-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <span className="text-[10px] text-brutal-gray uppercase tracking-[0.3em]">
            © 2026 WATCHR
          </span>
          <span className="text-[10px] text-brutal-gray uppercase tracking-[0.3em]">
            Powered by TMDB
          </span>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-bold transition-all border-b-2 ${
          isActive
            ? 'text-brutal-white border-brutal-red'
            : 'text-brutal-gray border-transparent hover:text-brutal-white hover:border-brutal-white'
        }`
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}
