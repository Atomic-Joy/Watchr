import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';
import { Clock, Tv, Film, TrendingUp, BarChart2 } from 'lucide-react';

export function Statistics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => fetchWithAuth('/users/me/stats'),
  });

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
          <StatBlock
            icon={<Tv className="w-5 h-5" />}
            label="Shows Done"
            value={`${stats?.shows_completed || 0}`}
            unit=""
            accent="text-brutal-green"
            border="border-b-2 md:border-b-0 md:border-r-2 border-brutal-border"
          />
          <StatBlock
            icon={<Film className="w-5 h-5" />}
            label="Movies"
            value={`${stats?.movies_watched || 0}`}
            unit=""
            accent="text-brutal-yellow"
            border="border-r-2 border-brutal-border"
          />
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
    </div>
  );
}

function StatBlock({ 
  icon, label, value, unit, accent, border 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  unit: string; 
  accent: string; 
  border: string;
}) {
  return (
    <div className={`bg-brutal-dark p-6 ${border} group hover:bg-brutal-mid transition-colors`}>
      <div className={`${accent} mb-4`}>{icon}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl md:text-4xl font-bold text-brutal-white font-mono tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-[10px] text-brutal-gray uppercase tracking-wider font-bold">
            {unit}
          </span>
        )}
      </div>
      <p className="text-[10px] text-brutal-gray uppercase tracking-[0.2em] mt-2 font-bold">
        {label}
      </p>
    </div>
  );
}
