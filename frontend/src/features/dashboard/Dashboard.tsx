import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';
import { Bell, Play, Clock, CheckCircle2, Tv } from 'lucide-react';

export function Dashboard() {
  // Fetch Notifications
  const { data: notifications, isLoading: loadingNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchWithAuth('/notifications/'),
  });

  // Fetch Watch Progress
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
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
          Dashboard
        </h1>
        <p className="text-slate-400">Welcome back. Here's what's happening with your shows.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Column (Up Next / Progress) */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                <Play className="w-6 h-6 mr-2 text-indigo-500" />
                Up Next
              </h2>
            </div>
            
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-2xl">
              {loadingProgress ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-xl bg-slate-800 h-24 w-24"></div>
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded"></div>
                      <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ) : progress && progress.length > 0 ? (
                <div className="space-y-4">
                  {progress.map((item: any, idx: number) => (
                    <div key={idx} className="group relative flex items-center p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 hover:border-indigo-500/30 transition-all cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="h-16 w-16 bg-slate-800 rounded-xl flex items-center justify-center mr-4 shadow-inner">
                        <Tv className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="flex-1 relative z-10">
                        <h3 className="font-bold text-lg text-slate-100 group-hover:text-indigo-300 transition-colors">{item.show_title}</h3>
                        <div className="flex items-center text-sm text-slate-400 mt-1">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mr-3 max-w-[200px]">
                            <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, item.progress_percent)}%` }}></div>
                          </div>
                          <span>{item.watched_episodes} / {item.total_episodes} watched</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          markNextWatchedMutation.mutate(item.tv_show_id);
                        }}
                        disabled={markNextWatchedMutation.isPending}
                        title="Mark next episode as watched"
                        className="relative z-10 ml-4 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        {markNextWatchedMutation.isPending && markNextWatchedMutation.variables === item.tv_show_id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tv className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400">You haven't tracked any shows yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column (Notifications) */}
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Bell className="w-5 h-5 mr-2 text-cyan-500" />
                Release Radar
              </h2>
            </div>
            
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] -mr-10 -mt-10 rounded-full pointer-events-none" />
              
              {loadingNotifs ? (
                <div className="space-y-4 relative z-10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex space-x-3">
                      <div className="rounded-full bg-slate-800 h-10 w-10"></div>
                      <div className="flex-1 py-1 space-y-2">
                        <div className="h-3 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-5 relative z-10">
                  {notifications.map((notif: any) => (
                    <div key={notif.id} className="relative pl-4 pr-10 py-2 border-l-2 border-indigo-500/50 hover:border-indigo-400 transition-colors group">
                      <div className="absolute -left-[5px] top-3.5 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                      <p className="text-sm text-slate-200 font-medium leading-snug">{notif.message}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(notif.release_date).toLocaleDateString()}
                      </p>
                      <button 
                        onClick={() => markAsReadMutation.mutate(notif.id)}
                        disabled={markAsReadMutation.isPending}
                        title="Mark as read"
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 relative z-10">
                  <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">All caught up! No new releases.</p>
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
