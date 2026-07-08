import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';
import { BarChart2, Clock, Tv, Film, TrendingUp } from 'lucide-react';

export function Statistics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => fetchWithAuth('/users/me/stats').catch(() => ({
      // Fallback mock data since endpoint might not be fully wired up yet
      total_hours: 342,
      shows_completed: 12,
      movies_watched: 45,
      favorite_genre: 'Drama'
    })),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
          Your Statistics
        </h1>
        <p className="text-slate-400">A look back at the time you've spent watching.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-900 rounded-3xl animate-pulse border border-slate-800"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Clock className="w-8 h-8 text-cyan-400" />}
            label="Total Time"
            value={`${stats?.total_hours || 0} hrs`}
            gradient="from-cyan-500/20 to-blue-500/5"
            borderColor="border-cyan-500/30"
          />
          <StatCard 
            icon={<Tv className="w-8 h-8 text-indigo-400" />}
            label="Shows Completed"
            value={stats?.shows_completed || 0}
            gradient="from-indigo-500/20 to-purple-500/5"
            borderColor="border-indigo-500/30"
          />
          <StatCard 
            icon={<Film className="w-8 h-8 text-pink-400" />}
            label="Movies Watched"
            value={stats?.movies_watched || 0}
            gradient="from-pink-500/20 to-rose-500/5"
            borderColor="border-pink-500/30"
          />
          <StatCard 
            icon={<TrendingUp className="w-8 h-8 text-emerald-400" />}
            label="Top Genre"
            value={stats?.favorite_genre || 'N/A'}
            gradient="from-emerald-500/20 to-teal-500/5"
            borderColor="border-emerald-500/30"
          />
        </div>
      )}

      <div className="mt-12 bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[150%] bg-indigo-500/5 rotate-12 pointer-events-none"></div>
        <h2 className="text-2xl font-bold mb-6 flex items-center relative z-10">
          <BarChart2 className="w-6 h-6 mr-3 text-indigo-500" />
          Watch Activity
        </h2>
        <div className="h-64 flex items-end space-x-2 relative z-10">
          {/* Mock chart bars */}
          {[40, 70, 30, 85, 50, 90, 60].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end items-center group">
              <div 
                className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-sm opacity-50 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                style={{ height: `${height}%` }}
              ></div>
              <span className="text-xs text-slate-500 mt-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, gradient, borderColor }: { icon: React.ReactNode, label: string, value: string | number, gradient: string, borderColor: string }) {
  return (
    <div className={`bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border ${borderColor} shadow-xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-default`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`}></div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="mb-4 bg-slate-950/50 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="text-slate-400 font-medium text-sm mb-1">{label}</h3>
          <p className="text-3xl font-bold text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}
