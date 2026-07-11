import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '../../lib/api';
import { Bell, CheckCircle2, Tv, CalendarDays, PlayCircle, ChevronRight, Clock } from 'lucide-react';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'progress' | 'calendar'>('progress');

  const { data: notifications, isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchWithAuth('/notifications/'),
  });

  const { data: progress, isLoading: loadingProgress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => fetchWithAuth('/users/me/progress'),
  });

  const activeProgress = progress?.filter((item: any) => item.progress_percent < 100) || [];

  const heroItem = useMemo(() => {
    if (activeProgress.length > 0) {
      const sorted = [...activeProgress].sort((a: any, b: any) => {
        const timeA = a.last_watched_at ? new Date(a.last_watched_at).getTime() : 0;
        const timeB = b.last_watched_at ? new Date(b.last_watched_at).getTime() : 0;
        return timeB - timeA;
      });
      return sorted[0];
    }
    return null;
  }, [progress]);

  const heroBg = heroItem?.poster_path
    ? `https://image.tmdb.org/t/p/original${heroItem.poster_path}`
    : null;

  const groupedNotifications = useMemo(() => {
    if (!notifications) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeekEnd = new Date(today); nextWeekEnd.setDate(today.getDate() + 7);

    const groups: Record<string, any[]> = {
      'Recently Released': [], 'Today': [], 'Tomorrow': [], 'Next Week': [], 'Later': []
    };

    notifications.forEach((notif: any) => {
      const d = new Date(notif.release_date); d.setHours(0, 0, 0, 0);
      if (d < today) groups['Recently Released'].push(notif);
      else if (d.getTime() === today.getTime()) groups['Today'].push(notif);
      else if (d.getTime() === tomorrow.getTime()) groups['Tomorrow'].push(notif);
      else if (d < nextWeekEnd) groups['Next Week'].push(notif);
      else groups['Later'].push(notif);
    });

    return ['Recently Released', 'Today', 'Tomorrow', 'Next Week', 'Later']
      .map(label => ({ label, items: groups[label] }))
      .filter(g => g.label === 'Today' || g.items.length > 0);
  }, [notifications]);

  const queryClient = useQueryClient();

  const markNextWatchedMutation = useMutation({
    mutationFn: (tvShowId: string) =>
      fetchWithAuth(`/users/me/progress/${tvShowId}/watch-next`, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['progress'] }); },
  });

  return (
    <div className="animate-slide-up pb-16">

      {/* ─── Hero Banner ─── */}
      <section className="relative rounded-2xl overflow-hidden mb-10 min-h-[260px] md:min-h-[320px] flex items-end border border-white/[0.06]">
        {/* Background */}
        {heroBg ? (
          <img
            src={heroBg}
            alt="hero"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] to-[#111]" />
        )}
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-8 md:p-10 w-full">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 mb-2">
            Continue Watching
          </p>
          <h1 className="font-serif italic text-4xl md:text-5xl text-white mb-1 leading-tight">
            {heroItem ? heroItem.show_title : 'Never Miss a Drop'}
          </h1>
          {heroItem ? (
            <div className="flex items-center gap-3 mt-3">
              {heroItem.next_episode_season !== null && (
                <span className="text-xs font-mono bg-white/10 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-white/70 rounded-lg">
                  S{String(heroItem.next_episode_season).padStart(2,'0')} · E{String(heroItem.next_episode_number).padStart(2,'0')}
                </span>
              )}
              <div className="h-1 flex-1 max-w-[160px] bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full"
                  style={{ width: `${heroItem.progress_percent}%` }}
                />
              </div>
              <span className="text-xs text-white/40 font-medium">{Math.round(heroItem.progress_percent)}%</span>
              <Link
                to={`/media/tv/${heroItem.tmdb_id}`}
                className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/15 px-4 py-2 rounded-xl transition-all duration-200"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Details
              </Link>
            </div>
          ) : (
            <p className="text-white/35 text-sm mt-1">Mark what you've watched. We'll handle the rest.</p>
          )}
        </div>
      </section>

      {/* ─── Tab Bar ─── */}
      <div className="flex items-center gap-1 mb-8 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl w-fit">
        {[
          { key: 'progress', label: 'Progress', Icon: PlayCircle },
          { key: 'calendar', label: 'Upcoming', Icon: CalendarDays },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'progress' | 'calendar')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-[10px] transition-all duration-200 ${
              activeTab === key
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'calendar' && notifications && notifications.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'}`}>
                {notifications.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      {activeTab === 'progress' ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Watching Now</h2>
            <span className="text-xs text-white/25 font-medium">{activeProgress.length} shows</span>
          </div>

          {loadingProgress ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[100px] bg-white/[0.03] animate-brutal-pulse rounded-2xl" />
              ))}
            </div>
          ) : activeProgress.length > 0 ? (
            <div className="space-y-3">
              {activeProgress.map((item: any, idx: number) => {
                const episodesLeft = item.total_episodes - item.watched_episodes;
                const pct = Math.min(100, item.progress_percent);

                return (
                  <div
                    key={idx}
                    className="group relative flex items-center gap-0 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    {/* Poster */}
                    <Link to={`/media/tv/${item.tmdb_id}`} className="shrink-0 w-[68px] self-stretch">
                      {item.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                          alt={item.show_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[100px] flex items-center justify-center bg-white/[0.03]">
                          <Tv className="w-6 h-6 text-white/10" />
                        </div>
                      )}
                    </Link>

                    {/* Progress bar bottom overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/[0.05]">
                      <div
                        className="h-full bg-[#ED1C24]/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 px-4 py-3.5 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/media/tv/${item.tmdb_id}`}>
                            <h3 className="text-sm font-semibold text-white truncate hover:text-white/70 transition-colors">
                              {item.show_title}
                            </h3>
                          </Link>

                          {item.next_episode_season !== null && item.next_episode_number !== null && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-white/30 tracking-wider">
                                UP NEXT · S{String(item.next_episode_season).padStart(2,'0')} E{String(item.next_episode_number).padStart(2,'0')}
                              </span>
                              {item.next_episode_title && (
                                <span className="text-[11px] text-white/25 truncate max-w-[180px]">
                                  {item.next_episode_title}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-white/20">
                              {item.watched_episodes}/{item.total_episodes} eps
                            </span>
                            {episodesLeft > 0 && (
                              <span className="text-[10px] text-white/15">· {episodesLeft} left</span>
                            )}
                            <span className="text-[10px] text-white/15 ml-auto font-mono">{Math.round(pct)}%</span>
                          </div>
                        </div>

                        {/* Mark watched */}
                        <button
                          onClick={() => markNextWatchedMutation.mutate(item.tv_show_id)}
                          disabled={markNextWatchedMutation.isPending}
                          title="Mark next episode watched"
                          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-white/10 hover:border-white/30 text-white/20 hover:text-white transition-all duration-200 hover:bg-white/5 disabled:opacity-40"
                        >
                          {markNextWatchedMutation.isPending && markNextWatchedMutation.variables === item.tv_show_id ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-transparent animate-spin rounded-full" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4 border border-white/[0.05] border-dashed rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Tv className="w-6 h-6 text-white/15" />
              </div>
              <div className="text-center">
                <p className="text-white/25 text-sm font-medium">No shows tracked yet</p>
                <p className="text-white/15 text-xs mt-1">Search and sync to get started</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Release Radar</h2>
            <span className="text-xs text-white/25 font-medium">{notifications?.length || 0} upcoming</span>
          </div>

          <div className="space-y-10">
            {loadingNotifs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[90px] bg-white/[0.03] animate-brutal-pulse rounded-2xl" />
                ))}
              </div>
            ) : groupedNotifications.length > 0 ? (
              groupedNotifications.map((group, idx) => (
                <div key={idx}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-white/50 whitespace-nowrap">{group.label}</h3>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                    {group.items.length > 0 && (
                      <span className="text-xs text-white/20 shrink-0">{group.items.length}</span>
                    )}
                  </div>

                  {group.items.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2 border border-white/[0.05] border-dashed rounded-2xl">
                      <Clock className="w-5 h-5 text-white/10" />
                      <p className="text-white/20 text-xs tracking-widest uppercase">Nothing airing today</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((notif: any) => {
                        const releaseDate = new Date(notif.release_date);
                        const dateStr = releaseDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        const timeStr = releaseDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                        return (
                          <Link
                            key={notif.id}
                            to={`/media/tv/${notif.tmdb_id}`}
                            className="group flex items-center gap-0 rounded-2xl border border-white/[0.06] hover:border-white/[0.13] transition-all duration-300 overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                          >
                            {/* Poster */}
                            <div className="w-[60px] shrink-0 self-stretch">
                              {notif.poster_path ? (
                                <img
                                  src={`https://image.tmdb.org/t/p/w185${notif.poster_path}`}
                                  alt={notif.show_title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full min-h-[88px] flex items-center justify-center bg-white/[0.02]">
                                  <Tv className="w-5 h-5 text-white/10" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 px-4 py-3 min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate group-hover:text-white/70 transition-colors">
                                {notif.show_title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-white/30 tracking-wider">
                                  S{String(notif.season_number).padStart(2,'0')} · E{String(notif.episode_number).padStart(2,'0')}
                                </span>
                                {notif.episode_title && (
                                  <span className="text-[11px] text-white/25 truncate">{notif.episode_title}</span>
                                )}
                              </div>
                              <p className="text-[10px] text-white/20 mt-1.5">{dateStr} · {timeStr}</p>
                            </div>

                            <div className="shrink-0 pr-4">
                              <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-24 gap-4 border border-white/[0.05] border-dashed rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white/15" />
                </div>
                <div className="text-center">
                  <p className="text-white/25 text-sm font-medium">All caught up</p>
                  <p className="text-white/15 text-xs mt-1">No upcoming releases found</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
