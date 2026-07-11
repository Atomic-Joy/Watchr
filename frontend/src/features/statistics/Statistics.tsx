import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '../../lib/api';
import { Clock, Tv, Film, TrendingUp, X, ChevronRight, ChevronLeft, MoreVertical } from 'lucide-react';

function formatHistoryDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  
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
  const carouselRef = useRef<HTMLDivElement>(null);
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

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Total Time"
            value={`${stats?.total_hours || 0}`}
            unit="hrs"
            color="#ED1C24"
          />
          <div onClick={() => setActiveModal('shows')} className="cursor-pointer">
            <StatCard
              icon={<Tv className="w-5 h-5" />}
              label="Shows Done"
              value={`${stats?.shows_completed || 0}`}
              unit="shows"
              color="#39FF14"
              clickable
            />
          </div>
          <div onClick={() => setActiveModal('movies')} className="cursor-pointer">
            <StatCard
              icon={<Film className="w-5 h-5" />}
              label="Movies"
              value={`${stats?.movies_watched || 0}`}
              unit="films"
              color="#FFD600"
              clickable
            />
          </div>
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Episodes"
            value={`${stats?.episodes_watched || 0}`}
            unit="eps"
            color="#0066FF"
          />
        </div>
      )}

      {/* History Carousel */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <Link to="/history" className="flex items-center gap-1 text-brutal-white font-medium cursor-pointer w-fit hover:text-brutal-gray transition-colors">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg">History</h2>
            <ChevronRight className="w-5 h-5" />
          </Link>
          
          <div className="flex gap-2">
            <button 
              onClick={() => scroll('left')}
              className="p-1 hover:bg-[#222] border border-brutal-border text-brutal-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="p-1 hover:bg-[#222] border border-brutal-border text-brutal-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {historyLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-[280px] shrink-0 h-[158px] bg-brutal-dark animate-brutal-pulse rounded-xl"></div>
            ))}
          </div>
        ) : history && history.length > 0 ? (
          <div 
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar"
          >
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

function StatCard({ icon, label, value, unit, color, clickable = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  color: string;
  clickable?: boolean;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] hover:border-white/[0.15] transition-all duration-300 h-full"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${color}18 0%, transparent 60%)`,
        }}
      />

      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, ${color}80, transparent)` }} />

      <div className="relative p-6 flex flex-col justify-between h-full min-h-[140px]">
        {/* Icon with glow bg */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>

        <div>
          {/* Number */}
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-4xl font-bold text-white tracking-tight leading-none">
              {value}
            </span>
            <span className="text-xs font-semibold tracking-wider" style={{ color: `${color}aa` }}>
              {unit}
            </span>
          </div>

          {/* Label */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] font-semibold">{label}</p>
            {clickable && (
              <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-200" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
