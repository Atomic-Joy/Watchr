import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../lib/api';
import { Tv, Film, AlignJustify, ArrowLeft, ChevronLeft, ChevronRight, Clock, Eye, MoreVertical } from 'lucide-react';

function formatGroupDate(date: Date) {
  const day = date.getDate();
  const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 || Math.floor(day % 100 / 10) === 1) ? 0 : day % 10];
  return `${date.toLocaleDateString('en-US', { month: 'long' })} ${day}${suffix}, ${date.getFullYear()}`;
}

function formatWatchedAt(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  if (diffDays < 7) return `Last ${date.toLocaleDateString('en-US', { weekday: 'long' })} at ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'movie' | 'episode'>('all');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => fetchWithAuth('/users/me/history'),
  });

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter((item: any) => filter === 'all' || item.media_type === filter);
  }, [history, filter]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredHistory.forEach((item: any) => {
      const key = formatGroupDate(new Date(item.watched_at));
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredHistory]);

  const timelineDays = useMemo(() => {
    const days = [];
    const dow = referenceDate.getDay();
    const sun = new Date(referenceDate);
    sun.setDate(sun.getDate() - dow);
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [referenceDate]);

  const isScrollingRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (isScrollingRef.current) return;
      
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length > 0) {
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const d = visible[0].target.getAttribute('data-date');
        if (d) setReferenceDate(new Date(d));
      }
    }, { rootMargin: '-10% 0px -70% 0px' });

    document.querySelectorAll('.date-group').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [groupedHistory]);

  const scrollToGroup = (date: Date) => {
    isScrollingRef.current = true;
    setReferenceDate(date);
    setTimeout(() => { isScrollingRef.current = false; }, 800);

    const clickedStr = formatGroupDate(date);
    let el = document.getElementById(`date-group-${clickedStr}`);
    
    if (!el) {
      const allGroups = Object.keys(groupedHistory).map(key => ({
        key,
        date: new Date(groupedHistory[key][0].watched_at)
      })).sort((a, b) => b.date.getTime() - a.date.getTime());
      
      const cDate = new Date(date); cDate.setHours(0,0,0,0);
      const nearest = allGroups.find(g => {
        const gDate = new Date(g.date); gDate.setHours(0,0,0,0);
        return gDate.getTime() <= cDate.getTime();
      });
      
      if (nearest) {
        el = document.getElementById(`date-group-${nearest.key}`);
      }
    }
    
    if (el) {
      // Temporarily set scroll-margin so scrollIntoView respects the sticky header
      el.style.scrollMarginTop = '190px';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const today = formatGroupDate(new Date());
  const yesterday = formatGroupDate(new Date(Date.now() - 86400000));

  return (
    <div className="animate-slide-up pb-20">

      {/* ─── Sticky Header ─── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/[0.06] pb-4 pt-5 mb-10"
        style={{
          background: 'linear-gradient(180deg, #000 80%, transparent)',
          marginLeft: '-2rem', marginRight: '-2rem',
          paddingLeft: '2rem', paddingRight: '2rem',
        }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 hover:border-white/25 text-white/40 hover:text-white transition-all duration-200 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">History</h1>
              <p className="text-xs text-white/25 mt-0.5 flex items-center gap-1.5 font-medium">
                <Eye className="w-3 h-3" />
                {isLoading ? '…' : `${filteredHistory.length} entries`}
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.05] border border-white/[0.07]">
            {([
              { key: 'all', label: 'All', Icon: AlignJustify },
              { key: 'episode', label: 'TV', Icon: Tv },
              { key: 'movie', label: 'Film', Icon: Film },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold tracking-wide rounded-[10px] transition-all duration-200 ${
                  filter === key
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/35 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar strip */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReferenceDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] hover:border-white/20 text-white/25 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 grid grid-cols-7 gap-1">
            {timelineDays.map((date, idx) => {
              const dateStr = formatGroupDate(date);
              const count = groupedHistory[dateStr]?.length || 0;
              const isActive = formatGroupDate(referenceDate) === dateStr;
              const isToday = dateStr === today;

              return (
                <button
                  key={idx}
                  onClick={() => scrollToGroup(date)}
                  className={`relative flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-black'
                      : isToday
                      ? 'border border-white/15 text-white/70 bg-white/5'
                      : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`text-[9px] font-semibold uppercase tracking-wider mb-1 ${isActive ? 'text-black/50' : ''}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="text-[15px] font-bold leading-none">{date.getDate()}</span>
                  <div className="h-1.5 mt-1.5 flex items-center justify-center gap-0.5">
                    {count > 0 && <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-black/50' : 'bg-[#ED1C24]'}`} />}
                    {count > 4 && <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-black/30' : 'bg-[#ED1C24]/50'}`} />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setReferenceDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] hover:border-white/20 text-white/25 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Feed ─── */}
      {isLoading ? (
        <div className="space-y-10">
          {[1, 2].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-28 bg-white/5 animate-brutal-pulse rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(j => <div key={j} className="h-[108px] bg-white/[0.03] animate-brutal-pulse rounded-2xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(groupedHistory).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Clock className="w-6 h-6 text-white/15" />
          </div>
          <p className="text-white/25 text-xs tracking-widest uppercase font-medium">Nothing watched yet</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedHistory).map(([dateLabel, items]) => {
            const rawDate = items[0].watched_at;
            const dateObj = new Date(rawDate);
            let dayTitle = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            if (dateLabel === today) dayTitle = `Today · ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
            else if (dateLabel === yesterday) dayTitle = `Yesterday · ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

            return (
              <div
                key={dateLabel}
                id={`date-group-${dateLabel}`}
                data-date={rawDate}
                className="date-group"
              >
                {/* Day header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-white/60 whitespace-nowrap">{dayTitle}</h2>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-xs text-white/20 font-medium shrink-0">{items.length}</span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item: any) => {
                    const isMovie = item.media_type === 'movie';
                    const showTitle = isMovie ? item.title : item.details?.show_title || item.title;
                    const episodeTitle = !isMovie ? item.title : null;
                    const seasonEp = !isMovie
                      ? `S${String(item.details?.season_number || 0).padStart(2, '0')} · E${String(item.details?.episode_number || 0).padStart(2, '0')}`
                      : null;

                    const posterUrl = item.details?.poster_path
                      ? `https://image.tmdb.org/t/p/w185${item.details.poster_path}`
                      : null;
                    const backdropUrl = item.details?.backdrop_path
                      ? `https://image.tmdb.org/t/p/w500${item.details.backdrop_path}`
                      : null;

                    const watchedText = formatWatchedAt(item.watched_at);

                    return (
                      <div
                        key={item.id}
                        className="group relative flex items-stretch gap-0 rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.14] transition-all duration-300 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                      >
                        {/* Backdrop blur behind card */}
                        {backdropUrl && (
                          <div
                            className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.13] transition-opacity duration-500"
                            style={{
                              backgroundImage: `url(${backdropUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: 'blur(12px)',
                            }}
                          />
                        )}

                        {/* Poster */}
                        <div className="relative w-[72px] shrink-0 overflow-hidden">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt={showTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full min-h-[108px] flex items-center justify-center bg-white/[0.03]">
                              {isMovie ? <Film className="w-6 h-6 text-white/10" /> : <Tv className="w-6 h-6 text-white/10" />}
                            </div>
                          )}
                          {/* color strip */}
                          <div className={`absolute right-0 top-0 bottom-0 w-[2px] ${isMovie ? 'bg-[#ED1C24]/70' : 'bg-[#0066FF]/70'}`} />
                        </div>

                        {/* Info */}
                        <div className="relative flex-1 px-3.5 py-3 flex flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              {/* Type + Episode badge */}
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                  isMovie
                                    ? 'bg-[#ED1C24]/15 text-[#FF6B6B]'
                                    : 'bg-[#0066FF]/15 text-[#6B9FFF]'
                                }`}>
                                  {isMovie ? 'Film' : 'Series'}
                                </span>
                                {seasonEp && (
                                  <span className="text-[9px] font-mono text-white/25 tracking-wider">{seasonEp}</span>
                                )}
                              </div>
                              <h3 className="text-[13px] font-semibold text-white leading-snug line-clamp-1">
                                {showTitle}
                              </h3>
                              {episodeTitle && (
                                <p className="text-[11px] text-white/35 mt-0.5 line-clamp-1 leading-tight">
                                  {episodeTitle}
                                </p>
                              )}
                            </div>
                            {/* Menu */}
                            <button className="shrink-0 text-white/15 hover:text-white/50 transition-colors duration-150 mt-0.5">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom row */}
                          <div className="mt-2">
                            <span className="text-[10px] text-white/20 font-medium">{watchedText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
