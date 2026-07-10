import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '../../lib/api';
import { Clock, Tv, Film, TrendingUp, X, ChevronRight, MoreVertical, Star } from 'lucide-react';

function formatHistoryDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  
  // Reset time part to compare just dates
  const dateDays = Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
  const nowDays = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  const diffDays = nowDays - dateDays;
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return 'Last ' + date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => fetchWithAuth('/users/me/history'),
  });

  const completedShows = progress?.filter((p: any) => p.watched_episodes === p.total_episodes && p.total_episodes > 0) || [];
  const watchedMovies = history?.filter((h: any) => h.media_type === 'movie') || [];


  return (
    <div className="space-y-12 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="font-serif italic text-4xl md:text-5xl text-brutal-white mb-2">Statistics</h1>
        <p className="text-brutal-gray text-xs uppercase tracking-[0.3em]">
          A look back at the time
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
            label="Episodes"
            value={`${stats?.episodes_watched || 0}`}
            unit=""
            accent="text-brutal-blue"
            border=""
          />
        </div>
      )}

      {/* History Carousel */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-1 text-brutal-white font-medium cursor-pointer w-fit hover:text-brutal-gray transition-colors">
          <h2 className="text-lg">History</h2>
          <ChevronRight className="w-5 h-5" />
        </div>
        
        {historyLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-[280px] shrink-0 h-[158px] bg-brutal-dark animate-brutal-pulse rounded-xl"></div>
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {history.slice(0, 10).map((item: any) => {
              const isMovie = item.media_type === 'movie';
              const title = isMovie ? item.title : item.details?.show_title || item.title;
              const subtitle = isMovie 
                ? 'Movie' 
                : `S${item.details?.season_number || 0} • E${item.details?.episode_number || 0} - ${item.title}`;
                
              const imagePath = item.details?.backdrop_path || item.details?.poster_path;
              const imageUrl = imagePath ? `https://image.tmdb.org/t/p/w780${imagePath}` : null;
              
              return (
                <div key={item.id} className="w-[280px] shrink-0 snap-start group cursor-pointer">
                  {/* Image container */}
                  <div className="w-full aspect-[16/9] bg-[#111] rounded-xl overflow-hidden relative mb-3 shadow-lg">
                    {imageUrl ? (
                      <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isMovie ? <Film className="w-8 h-8 text-[#333]" /> : <Tv className="w-8 h-8 text-[#333]" />}
                      </div>
                    )}
                    
                    {/* Timestamp badge */}
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-medium">
                      {formatHistoryDate(item.watched_at)}
                    </div>
                    
                    {/* Kebab menu */}
                    <button className="absolute top-2 right-2 text-white/80 hover:text-white p-1 bg-black/20 hover:bg-black/40 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Info below image */}
                  <div className="flex items-start justify-between gap-2 px-1">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-brutal-white truncate">
                        {title}
                      </h3>
                      <p className="text-[11px] text-brutal-gray truncate mt-0.5">
                        {subtitle}
                      </p>
                    </div>
                    <button className="text-brutal-gray hover:text-brutal-white transition-colors shrink-0 mt-0.5">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border-2 border-brutal-border border-dashed rounded-xl">
            <p className="text-brutal-gray text-sm uppercase tracking-wider">No history found</p>
          </div>
        )}
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
