import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';
import { Play, CheckCircle2, XCircle, PlusCircle, Star, Calendar, Clock, Tv, Film, ChevronDown, Search as SearchIcon, ArrowDownAZ, ArrowUpAZ, ArrowLeft } from 'lucide-react';

export function MediaDetail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch Media Details
  const endpoint = type === 'movie' ? `/metadata/movies/${id}` : `/metadata/tv/${id}`;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['media', type, id],
    queryFn: () => fetchWithAuth(endpoint),
    refetchInterval: (query) => (query.state.data?.status === 'syncing' ? 2000 : false),
  });

  // Fetch Progress (to check if TV show is tracked)
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => fetchWithAuth('/users/me/progress'),
    enabled: type === 'tv',
  });

  // Fetch History (to check if Movie is watched or episodes watched)
  const { data: history } = useQuery({
    queryKey: ['history'],
    queryFn: () => fetchWithAuth('/users/me/history'),
  });

  // Mutations
  const trackShowMutation = useMutation({
    mutationFn: (tvShowId: string) => fetchWithAuth(`/users/me/progress/${tvShowId}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  });

  const untrackShowMutation = useMutation({
    mutationFn: (tvShowId: string) => fetchWithAuth(`/users/me/progress/${tvShowId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  });

  const markMovieWatchedMutation = useMutation({
    mutationFn: (movieId: string) => fetchWithAuth(`/users/me/history/movie/${movieId}`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });

  const markEpisodeWatchedMutation = useMutation({
    mutationFn: (episodeId: string) => fetchWithAuth(`/users/me/history/episode/${episodeId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  const unmarkEpisodeWatchedMutation = useMutation({
    mutationFn: (episodeId: string) => fetchWithAuth(`/users/me/history/episode/${episodeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  const isMovie = type === 'movie';
  const validSeasons = useMemo(() => {
    return data?.seasons?.filter((s: any) => s.season_number > 0) || [];
  }, [data]);
  
  // Initialize selected season when data loads
  useEffect(() => {
    if (data && !isMovie && validSeasons.length > 0 && selectedSeason === null) {
      setSelectedSeason(validSeasons[0].season_number);
    }
  }, [data, isMovie, selectedSeason, validSeasons]);

  const currentSeason = validSeasons.find((s: any) => s.season_number === selectedSeason);
  
  const filteredAndSortedEpisodes = useMemo(() => {
    if (!currentSeason?.episodes) return [];
    
    let eps = currentSeason.episodes.filter((ep: any) => 
      ep.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (sortOrder === 'desc') {
      eps = [...eps].reverse(); // Assuming they are natively sorted asc
    }
    
    return eps;
  }, [currentSeason, searchQuery, sortOrder]);

  if (isLoading || data?.status === 'syncing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-slide-up">
        <div className="text-brutal-red text-2xl font-bold tracking-widest uppercase animate-brutal-pulse mb-4">
          {data?.status === 'syncing' ? 'SYNCING FROM TMDB' : 'LOADING DETAILS'}
        </div>
        <div className="w-12 h-12 border-4 border-brutal-white border-t-brutal-red rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="border-2 border-brutal-red bg-brutal-red/10 p-8 text-center animate-slide-up">
        <h2 className="text-brutal-red text-xl font-bold uppercase tracking-widest mb-2">Error</h2>
        <p className="text-brutal-white font-mono">Failed to load media details.</p>
      </div>
    );
  }

  const title = data.title;
  const isTracked = type === 'tv' && progress?.some((p: any) => p.tv_show_id === data.id);
  const isMovieWatched = type === 'movie' && history?.some((h: any) => h.media_type === 'movie' && h.title === title);

  const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null;
  const posterUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-brutal-gray hover:text-brutal-white transition-colors font-mono uppercase tracking-widest text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero Banner */}
      <div className="relative border-2 border-brutal-border bg-brutal-dark overflow-hidden min-h-[40vh] md:min-h-[60vh] flex flex-col justify-end">
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <img src={backdropUrl} alt={title} className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-brutal-black via-brutal-black/80 to-transparent"></div>
          </div>
        )}
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-end">
          {/* Poster */}
          <div className="hidden md:block w-48 flex-shrink-0 border-2 border-brutal-white shadow-[8px_8px_0px_#ED1C24] bg-brutal-mid">
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="w-full h-auto" />
            ) : (
              <div className="w-full aspect-[2/3] flex items-center justify-center">
                {isMovie ? <Film className="w-12 h-12 text-brutal-border" /> : <Tv className="w-12 h-12 text-brutal-border" />}
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-end">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${isMovie ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-green text-brutal-black'}`}>
                  {isMovie ? 'Film' : 'TV Show'}
                </span>
                {data.status && (
                  <span className="text-[10px] text-brutal-gray uppercase tracking-widest font-mono">
                    {data.status}
                  </span>
                )}
              </div>
            
            <h1 className="font-serif italic text-4xl md:text-6xl lg:text-7xl text-brutal-white mb-4 leading-none">
              {title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-brutal-gray font-mono uppercase tracking-wider mb-8">
              {data.vote_average > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-brutal-yellow fill-brutal-yellow" />
                  <span className="text-brutal-yellow font-bold">{data.vote_average.toFixed(1)}</span>
                </div>
              )}
              {(data.release_date || data.first_air_date) && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{(data.release_date || data.first_air_date).substring(0, 4)}</span>
                </div>
              )}
              {data.runtime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{data.runtime} MIN</span>
                </div>
              )}
              {!isMovie && validSeasons.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  <span>{validSeasons.length} Season{validSeasons.length !== 1 ? 's' : ''} • {validSeasons.reduce((acc: number, s: any) => acc + (s.episode_count || s.episodes?.length || 0), 0)} Episodes</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              {isMovie ? (
                <button
                  onClick={() => markMovieWatchedMutation.mutate(data.id)}
                  disabled={markMovieWatchedMutation.isPending}
                  className="brutal-btn brutal-btn-primary"
                >
                  <Play className="w-4 h-4" />
                  {isMovieWatched ? 'WATCHED (MARK AGAIN)' : 'MARK AS WATCHED'}
                </button>
              ) : (
                isTracked ? (
                  <button
                    onClick={() => untrackShowMutation.mutate(data.id)}
                    disabled={untrackShowMutation.isPending}
                    className="brutal-btn border-brutal-gray text-brutal-gray hover:bg-brutal-gray hover:text-brutal-black"
                  >
                    <XCircle className="w-4 h-4" />
                    UNTRACK SHOW
                  </button>
                ) : (
                  <button
                    onClick={() => trackShowMutation.mutate(data.id)}
                    disabled={trackShowMutation.isPending}
                    className="brutal-btn brutal-btn-primary"
                  >
                    <PlusCircle className="w-4 h-4" />
                    TRACK SHOW
                  </button>
                )
              )}
            </div>
            </div>

            {/* Overview */}
            {data.overview && (
              <div className="lg:w-1/3 border-l-4 border-brutal-red pl-6 py-2">
                <p className="text-sm md:text-base text-brutal-white font-medium leading-relaxed drop-shadow-md">
                  {data.overview}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TV Seasons */}
      {!isMovie && validSeasons.length > 0 && (
        <div className="space-y-6 mt-16 max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-brutal-red"></div>
            <h2 className="text-2xl font-bold tracking-wide text-brutal-white">Episodes</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative group min-w-[200px]">
              <select 
                value={selectedSeason || ''} 
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
                className="w-full appearance-none bg-[#111111] border border-[#222222] text-brutal-white py-3 px-4 rounded-xl focus:outline-none focus:border-[#444444] transition-colors cursor-pointer text-sm"
              >
                {validSeasons.map((s: any) => (
                  <option key={s.id} value={s.season_number}>
                    Season {s.season_number}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-brutal-gray group-hover:text-brutal-white transition-colors">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brutal-gray">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Search episode..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111111] border border-[#222222] text-brutal-white py-3 pl-11 pr-4 rounded-xl focus:outline-none focus:border-[#444444] transition-colors text-sm placeholder-brutal-gray/50"
              />
            </div>

            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex-shrink-0 bg-[#111111] border border-[#222222] hover:border-[#444444] text-brutal-gray hover:text-brutal-white transition-colors w-12 h-12 flex items-center justify-center rounded-xl"
            >
              {sortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[#222222]">
              {filteredAndSortedEpisodes.length === 0 ? (
                <div className="p-8 text-center text-brutal-gray text-sm">
                  No episodes found.
                </div>
              ) : (
                filteredAndSortedEpisodes.map((episode: any) => {
                  const isWatched = history?.some((h: any) => h.media_type === 'episode' && h.media_id === episode.id);

                  return (
                    <div key={episode.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-[#1a1a1a] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-mono font-bold text-brutal-red bg-brutal-red/10 px-2 py-0.5 rounded">
                            E{episode.episode_number.toString().padStart(2, '0')}
                          </span>
                          <h4 className="font-bold text-sm text-brutal-white truncate">
                            {episode.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-brutal-gray font-mono ml-12">
                          {episode.air_date || 'TBA'} {episode.runtime ? `• ${episode.runtime} MIN` : ''}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (isWatched) {
                            unmarkEpisodeWatchedMutation.mutate(episode.id);
                          } else {
                            markEpisodeWatchedMutation.mutate(episode.id);
                          }
                        }}
                        disabled={markEpisodeWatchedMutation.isPending || unmarkEpisodeWatchedMutation.isPending}
                        className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg border border-[#333333] ${
                          isWatched 
                            ? 'text-brutal-green bg-brutal-green/10 hover:bg-brutal-red/10 hover:text-brutal-red hover:border-brutal-red/50 cursor-pointer border-brutal-green/20'
                            : 'text-brutal-white hover:bg-brutal-white hover:text-brutal-black hover:border-brutal-white cursor-pointer'
                        }`}
                        title={isWatched ? "Click to unwatch" : "Click to mark as watched"}
                      >
                        {isWatched ? (
                          <><CheckCircle2 className="w-3 h-3 group-hover:hidden" /><XCircle className="w-3 h-3 hidden group-hover:block" /> <span className="group-hover:hidden">WATCHED</span><span className="hidden group-hover:block">UNWATCH</span></>
                        ) : (
                          <><Play className="w-3 h-3" /> MARK WATCHED</>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
