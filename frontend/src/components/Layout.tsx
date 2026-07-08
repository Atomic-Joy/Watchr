import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { Home, Search, BarChart2, LogOut, Film } from 'lucide-react';

export function Layout() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex flex-col bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/60 shadow-2xl transition-all duration-300">
        <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
          <Film className="w-8 h-8 text-indigo-500 mr-3 animate-pulse-slow" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
            Watchr
          </h1>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Dashboard" />
          <NavItem to="/search" icon={<Search className="w-5 h-5" />} label="Search" />
          <NavItem to="/stats" icon={<BarChart2 className="w-5 h-5" />} label="Statistics" />
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        <div className="relative z-10 h-full p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 rounded-xl transition-all duration-300 ease-out group ${
          isActive
            ? 'bg-gradient-to-r from-indigo-600/20 to-cyan-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
        }`
      }
    >
      <div className="mr-3 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}
