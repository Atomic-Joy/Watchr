import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchWithAuth } from '../../lib/api';
import { Bell, CheckCircle2, Tv } from 'lucide-react';

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

  const randomHeroImage = useMemo(() => {
    if (activeProgress.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeProgress.length);
      const selected = activeProgress[randomIndex];
      if (selected && selected.poster_path) {
        return `https://image.tmdb.org/t/p/original${selected.poster_path}`;
      }
    }
    return "/bghead.jpg";
  }, [progress]);

  const groupedNotifications = useMemo(() => {
    if (!notifications) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeekEnd = new Date(today);
    nextWeekEnd.setDate(today.getDate() + 7);

    const groups: Record<string, any[]> = {
      'Recently Released': [],
      'Today': [],
      'Tomorrow': [],
      'Next Week': [],
      'Later': []
    };

    notifications.forEach((notif: any) => {
      const d = new Date(notif.release_date);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() < today.getTime()) {
        groups['Recently Released'].push(notif);
      } else if (d.getTime() === today.getTime()) {
        groups['Today'].push(notif);
      } else if (d.getTime() === tomorrow.getTime()) {
        groups['Tomorrow'].push(notif);
      } else if (d.getTime() < nextWeekEnd.getTime()) {
        groups['Next Week'].push(notif);
      } else {
        groups['Later'].push(notif);
      }
    });

    return [
      { label: 'Recently Released', items: groups['Recently Released'] },
      { label: 'Today', items: groups['Today'] },
      { label: 'Tomorrow', items: groups['Tomorrow'] },
      { label: 'Next Week', items: groups['Next Week'] },
      { label: 'Later', items: groups['Later'] }
    ].filter(g => g.label === 'Today' || g.items.length > 0);
  }, [notifications]);

  const queryClient = useQueryClient();


  const markNextWatchedMutation = useMutation({
    mutationFn: (tvShowId: string) =>
      fetchWithAuth(`/users/me/progress/${tvShowId}/watch-next`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  return (
    <div className="space-y-12 animate-slide-up">
      {/* Mobile Header (Statistics Style) */}
      <div className="block md:hidden">
        <h1 className="font-serif italic text-4xl text-brutal-white mb-2">Never Miss a Drop</h1>
        <p className="text-brutal-gray text-xs uppercase tracking-[0.3em] pr-4 leading-relaxed">
          Mark what you've watched. We'll handle the rest.
        </p>
      </div>

      {/* Desktop Hero Section */}
      <section className="hidden md:block relative border-2 border-brutal-border bg-brutal-dark overflow-hidden">
        {/* Image / background taking full width but anchored right */}
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-brutal-mid overflow-hidden">
          <img src={randomHeroImage} alt="Hero background" className="w-full h-full object-cover object-right opacity-80" />
        </div>

        {/* Gradient overlay for smooth fade transition */}
        <div className="absolute inset-0 bg-gradient-to-r from-brutal-dark from-30% via-brutal-dark/80 via-50% to-transparent z-10 pointer-events-none"></div>

        <div className="relative z-20 p-8 md:p-12 flex flex-col justify-end min-h-[200px] w-2/3">
          <h1 className="font-serif italic text-4xl md:text-6xl text-brutal-white mb-2">
            Never Miss a Drop
          </h1>
          <p className="text-brutal-gray text-sm uppercase tracking-wider max-w-md">
            Mark what you've watched. We'll handle the rest.
          </p>
        </div>
      </section>

      <div>
        {/* Tabs */}
        <div className="flex gap-8 mb-8 border-b border-[#222]">
          <button
            onClick={() => setActiveTab('progress')}
            className={`pb-3 text-xl font-medium transition-colors relative ${activeTab === 'progress' ? 'text-white' : 'text-[#888] hover:text-white'}`}
          >
            Progress
            {activeTab === 'progress' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-brutal-red rounded-t-sm" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-xl font-medium transition-colors relative ${activeTab === 'calendar' ? 'text-white' : 'text-[#888] hover:text-white'}`}
          >
            Calendar
            {activeTab === 'calendar' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-brutal-red rounded-t-sm" />
            )}
          </button>
        </div>

        {activeTab === 'progress' ? (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-brutal-gray uppercase tracking-wider">
                {activeProgress.length} shows
              </span>
            </div>

            {loadingProgress ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-brutal-dark border-2 border-brutal-border animate-brutal-pulse"></div>
                ))}
              </div>
            ) : activeProgress.length > 0 ? (
              <div className="space-y-3">
                {activeProgress.map((item: any, idx: number) => {
                  const episodesLeft = item.total_episodes - item.watched_episodes;

                  return (
                    <div key={idx} className="flex gap-4 items-stretch group">
                      {/* Poster */}
                      <Link to={`/media/tv/${item.tmdb_id}`} className="block flex-shrink-0">
                        <div className="w-[100px] h-[150px] bg-[#111] rounded-xl overflow-hidden relative shadow-lg">
                          {item.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                              alt={item.show_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tv className="w-8 h-8 text-[#333]" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex flex-col flex-1 py-1 min-w-0 justify-between">
                        <div>
                          <Link to={`/media/tv/${item.tmdb_id}`} className="block">
                            <h3 className="font-bold text-xl text-white truncate hover:text-brutal-red transition-colors">
                              {item.show_title}
                            </h3>
                          </Link>

                          {item.next_episode_season !== null && item.next_episode_number !== null && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="bg-[#2a2a2a] text-[#ddd] text-xs font-mono px-2 py-1 rounded-md">
                                S.{item.next_episode_season.toString().padStart(2, '0')} E.{item.next_episode_number.toString().padStart(2, '0')}
                              </span>
                              <span className="text-sm text-[#ccc] truncate">
                                {item.next_episode_title || 'TBA'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-[#888] whitespace-nowrap">
                              {item.watched_episodes}/{item.total_episodes} {episodesLeft > 0 ? `(${episodesLeft} left)` : ''}
                            </span>
                            <div className="flex-1 h-1.5 bg-[#333] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brutal-red rounded-full"
                                style={{ width: `${Math.min(100, item.progress_percent)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 mt-4">
                          <Link to={`/media/tv/${item.tmdb_id}`} className="text-sm text-[#888] hover:text-white transition-colors">
                            Details
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              markNextWatchedMutation.mutate(item.tv_show_id);
                            }}
                            disabled={markNextWatchedMutation.isPending}
                            className="w-16 h-8 rounded-full border border-white flex items-center justify-center hover:bg-white hover:text-black text-white transition-colors disabled:opacity-50"
                          >
                            {markNextWatchedMutation.isPending && markNextWatchedMutation.variables === item.tv_show_id ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full"></div>
                            ) : (
                              <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border-2 border-brutal-border bg-brutal-dark p-12 text-center">
                <Tv className="w-12 h-12 text-brutal-border mx-auto mb-3" />
                <p className="text-brutal-gray text-sm uppercase tracking-wider">No shows tracked yet</p>
                <p className="text-brutal-border text-xs mt-1 uppercase">Search and sync to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">
            {/* Calendar / Release Radar */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-brutal-gray uppercase tracking-wider">
                {notifications?.length || 0} upcoming releases
              </span>
            </div>

            <div className="space-y-12">
              {loadingNotifs ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-brutal-dark animate-brutal-pulse rounded-xl"></div>
                  ))}
                </div>
              ) : groupedNotifications.length > 0 ? (
                groupedNotifications.map((group, idx) => (
                  <div key={idx}>
                    <h2 className="text-3xl text-white font-normal mb-6">{group.label}</h2>
                    <div className="space-y-8">
                      {group.items.length === 0 ? (
                        <div className="p-8 text-center border border-[#222] rounded-xl border-dashed">
                          <p className="text-[#888] text-sm uppercase tracking-wider">Nothing airing today</p>
                        </div>
                      ) : (
                        group.items.map((notif: any) => (
                          <div key={notif.id} className="flex gap-4 items-stretch group">
                            {/* Poster */}
                            <Link to={`/media/tv/${notif.tmdb_id}`} className="block flex-shrink-0">
                              <div className="w-[100px] h-[150px] bg-[#111] rounded-xl overflow-hidden relative shadow-lg">
                                {notif.poster_path ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w500${notif.poster_path}`}
                                    alt={notif.show_title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Tv className="w-8 h-8 text-[#333]" />
                                  </div>
                                )}
                              </div>
                            </Link>

                            {/* Info */}
                            <div className="flex flex-col flex-1 py-1 min-w-0 justify-between">
                              <div>
                                <Link to={`/media/tv/${notif.tmdb_id}`} className="block">
                                  <h3 className="text-2xl text-white truncate hover:text-[#ccc] transition-colors font-normal">
                                    {notif.show_title}
                                  </h3>
                                </Link>

                                <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-[#2a2a2a] text-[#ddd] text-xs font-mono px-2 py-1 rounded-md">
                                    S.{notif.season_number.toString().padStart(2, '0')} E.{notif.episode_number.toString().padStart(2, '0')}
                                  </span>
                                  <span className="text-sm text-[#ccc] truncate">
                                    {notif.episode_title}
                                  </span>
                                </div>

                                <p className="text-sm text-[#888] mt-3">
                                  {new Date(notif.release_date).toLocaleString('en-GB', {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                  })}
                                </p>
                              </div>

                              <div className="flex items-center justify-end mt-4">
                                <Link to={`/media/tv/${notif.tmdb_id}`} className="text-sm text-[#888] hover:text-white transition-colors uppercase tracking-widest">
                                  Details
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center border border-[#222] rounded-xl">
                  <Bell className="w-12 h-12 text-[#333] mx-auto mb-3" />
                  <p className="text-[#888] text-sm uppercase tracking-wider">All caught up</p>
                  <p className="text-[#555] text-xs mt-1 uppercase">No upcoming releases found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
