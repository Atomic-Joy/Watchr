import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '../../lib/api';
import { Clock, Tv, Film, TrendingUp, BarChart2, X } from 'lucide-react';

export function Statistics() {
  const [activeModal, setActiveModal] = useState<'shows' | 'movies' | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => fetchWithAuth('/users/me/stats'),
  });

  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => fetchWithAuth('/users/me/progress'),
    enabled: activeModal === 'shows',
  });

  const { data: history } = useQuery({
    queryKey: ['history'],
    queryFn: () => fetchWithAuth('/users/me/history'),
    enabled: activeModal === 'movies',
  });

  const completedShows = progress?.filter((p: any) => p.watched_episodes === p.total_episodes && p.total_episodes > 0) || [];
  const watchedMovies = history?.filter((h: any) => h.media_type === 'movie') || [];


  return (
    <div className="space-y-12 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="font-serif italic text-4xl md:text-5xl text-brutal-white mb-2">Statistics</h1>
        <p className="text-brutal-gray text-xs uppercase tracking-[0.3em]">
          A look back at the time you've spent watching
        </p>
      </div>

      {/* Stat Blocks */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 bg-brutal-dark border-2 border-brutal-border animate-brutal-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-2 border-brutal-border">
          <StatBlock
            icon={<Clock className="w-5 h-5" />}
            label="Total Time"
            value={`${stats?.total_hours || 0}`}
            unit="HRS"
            accent="text-brutal-red"
            border="border-r-2 border-b-2 md:border-b-0 border-brutal-border"
          />
          <div onClick={() => setActiveModal('shows')} className="cursor-pointer hover:bg-brutal-mid transition-colors group">
            <StatBlock
              icon={<Tv className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              label="Shows Done"
              value={`${stats?.shows_completed || 0}`}
              unit=""
              accent="text-brutal-green"
              border="border-b-2 md:border-b-0 md:border-r-2 border-brutal-border"
            />
          </div>
          <div onClick={() => setActiveModal('movies')} className="cursor-pointer hover:bg-brutal-mid transition-colors group">
            <StatBlock
              icon={<Film className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              label="Movies"
              value={`${stats?.movies_watched || 0}`}
              unit=""
              accent="text-brutal-yellow"
              border="border-r-2 border-brutal-border"
            />
          </div>
          <StatBlock
            icon={<TrendingUp className="w-5 h-5" />}
            label="Top Genre"
            value={stats?.favorite_genre || 'N/A'}
            unit=""
            accent="text-brutal-blue"
            border=""
          />
        </div>
      )}

      {/* Watch Activity Chart */}
      <div className="border-2 border-brutal-border bg-brutal-dark">
        <div className="px-6 py-4 border-b-2 border-brutal-border flex items-center gap-3">
          <BarChart2 className="w-4 h-4 text-brutal-red" />
          <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-brutal-white">
            Watch Activity
          </h2>
          <div className="flex-1 h-px bg-brutal-border"></div>
          <span className="text-[10px] text-brutal-gray uppercase tracking-wider">This Week</span>
        </div>

        <div className="p-6">
          <div className="h-48 flex items-end gap-2">
            {[40, 70, 30, 85, 50, 90, 60].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group">
                <div
                  className="w-full bg-brutal-red group-hover:bg-brutal-white transition-colors cursor-pointer relative"
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-brutal-white text-brutal-black px-2 py-1 text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {Math.round(height * 0.3)}m
                  </div>
                </div>
                <span className="text-[10px] text-brutal-gray mt-3 font-mono uppercase">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="relative -mt-48 h-48 pointer-events-none">
            {[0, 25, 50, 75, 100].map(pct => (
              <div
                key={pct}
                className="absolute w-full border-t border-brutal-border/30"
                style={{ bottom: `${pct}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brutal-black/80">
          <div className="bg-brutal-dark border-2 border-brutal-border w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b-2 border-brutal-border flex justify-between items-center">
              <h3 className="font-bold uppercase tracking-widest text-brutal-white">
                {activeModal === 'shows' ? 'Completed Shows' : 'Watched Movies'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-brutal-gray hover:text-brutal-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="divide-y-2 divide-brutal-border">
              {(activeModal === 'shows' ? completedShows : watchedMovies).map((item: any) => {
                const tmdbId = activeModal === 'shows' ? item.tmdb_id : item.details?.tmdb_id;
                const link = activeModal === 'shows' ? `/media/tv/${tmdbId}` : `/media/movie/${tmdbId}`;
                const title = activeModal === 'shows' ? item.show_title : item.title;
                const itemId = activeModal === 'shows' ? item.tv_show_id : item.media_id;
                
                return (
                  <Link key={itemId} to={link} className="block p-4 group hover:bg-brutal-mid transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-brutal-white group-hover:text-brutal-red transition-colors">{title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({ icon, label, value, unit, accent, border }: { icon: React.ReactNode, label: string, value: string, unit: string, accent: string, border: string }) {
  return (
    <div className={`p-6 md:p-8 flex flex-col justify-between h-full bg-brutal-dark ${border}`}>
      <div className={`mb-6 ${accent}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-brutal-white tracking-tight">
            {value}
          </span>
          {unit && <span className="text-xs text-brutal-gray font-bold tracking-widest">{unit}</span>}
        </div>
        <span className="text-[10px] text-brutal-gray uppercase font-bold tracking-[0.2em]">{label}</span>
      </div>
    </div>
  );
}
