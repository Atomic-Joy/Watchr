import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';
import { Bell, Play, Clock, CheckCircle2, Tv } from 'lucide-react';

export function Dashboard() {
  const { data: notifications, isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchWithAuth('/notifications/'),
  });

  const { data: progress, isLoading: loadingProgress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => fetchWithAuth('/users/me/progress'),
  });

  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      fetchWithAuth(`/notifications/${notificationId}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markNextWatchedMutation = useMutation({
    mutationFn: (tvShowId: string) =>
      fetchWithAuth(`/users/me/progress/${tvShowId}/watch-next`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  return (
    <div className="space-y-12 animate-slide-up">
      {/* Hero Section */}
      <section className="relative border-2 border-brutal-border bg-brutal-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brutal-black via-transparent to-transparent z-10"></div>
        <div className="relative z-20 p-8 md:p-12 flex flex-col justify-end min-h-[200px]">
          <h1 className="font-serif italic text-4xl md:text-6xl text-brutal-white mb-2">
            Never Miss a Drop
          </h1>
          <p className="text-brutal-gray text-sm uppercase tracking-wider max-w-md">
            Mark what you've watched. We'll handle the rest.
          </p>
        </div>
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-24 h-24 border-l-2 border-b-2 border-brutal-red z-20 flex items-center justify-center">
          <Play className="w-8 h-8 text-brutal-red" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Up Next — Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-brutal-white">Up Next</h2>
            <div className="flex-1 h-px bg-brutal-border"></div>
            <span className="text-[10px] text-brutal-gray uppercase tracking-wider">
              {progress?.length || 0} shows
            </span>
          </div>

          {loadingProgress ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-brutal-dark border-2 border-brutal-border animate-brutal-pulse"></div>
              ))}
            </div>
          ) : progress && progress.length > 0 ? (
            <div className="space-y-3">
              {progress.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="brutal-card flex items-center p-0 group"
                >
                  {/* Poster placeholder */}
                  <div className="w-20 h-24 bg-brutal-mid border-r-2 border-brutal-border flex items-center justify-center flex-shrink-0">
                    <Tv className="w-8 h-8 text-brutal-border" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <h3 className="font-bold text-sm text-brutal-white uppercase tracking-wide truncate group-hover:text-brutal-red transition-colors">
                      {item.show_title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="brutal-progress flex-1 max-w-[180px]">
                        <div
                          className="brutal-progress-fill"
                          style={{ width: `${Math.min(100, item.progress_percent)}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] text-brutal-gray font-mono tracking-tight">
                        {item.watched_episodes}/{item.total_episodes}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      markNextWatchedMutation.mutate(item.tv_show_id);
                    }}
                    disabled={markNextWatchedMutation.isPending}
                    title="Mark next episode as watched"
                    className="relative z-10 w-20 h-24 flex items-center justify-center border-l-2 border-brutal-border bg-brutal-mid hover:bg-brutal-red text-brutal-gray hover:text-brutal-white transition-all flex-shrink-0 disabled:opacity-50"
                  >
                    {markNextWatchedMutation.isPending && markNextWatchedMutation.variables === item.tv_show_id ? (
                      <div className="w-5 h-5 border-2 border-brutal-white border-t-transparent animate-spin"></div>
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-brutal-border bg-brutal-dark p-12 text-center">
              <Tv className="w-12 h-12 text-brutal-border mx-auto mb-3" />
              <p className="text-brutal-gray text-sm uppercase tracking-wider">No shows tracked yet</p>
              <p className="text-brutal-border text-xs mt-1 uppercase">Search and sync to get started</p>
            </div>
          )}
        </div>

        {/* Release Radar — Sidebar */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-brutal-white">Release Radar</h2>
            <div className="flex-1 h-px bg-brutal-border"></div>
            <Bell className="w-3 h-3 text-brutal-red" />
          </div>

          <div className="border-2 border-brutal-border bg-brutal-dark">
            {loadingNotifs ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-brutal-mid animate-brutal-pulse"></div>
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="divide-y-2 divide-brutal-border">
                {notifications.map((notif: any) => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-brutal-mid transition-colors group relative"
                  >
                    <p className="text-sm text-brutal-white font-medium leading-snug pr-8">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-brutal-gray mt-1 font-mono uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.release_date).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => markAsReadMutation.mutate(notif.id)}
                      disabled={markAsReadMutation.isPending}
                      title="Mark as read"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brutal-border hover:text-brutal-green opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-brutal-border mx-auto mb-2" />
                <p className="text-brutal-gray text-xs uppercase tracking-wider">All caught up</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
