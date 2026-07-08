import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Film, Tv, Star, Calendar } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';

// Need to debounce the input to prevent spamming requests
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => fetchWithAuth(`/metadata/search?query=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length > 2,
  });

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8 relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies or TV shows..."
          className="block w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl text-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-xl transition-all duration-300"
        />
        {isLoading && (
          <div className="absolute right-4 top-4">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {isError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-center">
            Failed to fetch search results. Please try again.
          </div>
        )}

        {!isLoading && !isError && data?.results?.length === 0 && debouncedQuery.length > 2 && (
          <div className="text-center text-slate-400 mt-12">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl">No results found for "{debouncedQuery}"</p>
          </div>
        )}

        {!isLoading && !isError && !data && debouncedQuery.length <= 2 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
            <Film className="w-16 h-16 opacity-20" />
            <p>Start typing to search TMDB...</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.results?.map((item: any) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaCard({ item }: { item: any }) {
  const isMovie = item.media_type === 'movie';
  const title = isMovie ? item.title : item.name;
  const date = isMovie ? item.release_date : item.first_air_date;
  const imageUrl = item.poster_path 
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : 'https://via.placeholder.com/500x750?text=No+Image';

  return (
    <div className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:-translate-y-1 cursor-pointer flex flex-col">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-800">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-2 right-2 flex space-x-2">
          <span className="px-2 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-xs font-medium border border-slate-700/50 flex items-center shadow-lg">
            {isMovie ? <Film className="w-3 h-3 mr-1 text-cyan-400" /> : <Tv className="w-3 h-3 mr-1 text-indigo-400" />}
            {isMovie ? 'Movie' : 'TV'}
          </span>
        </div>
        {/* Gradient overlay for text legibility at bottom of image if needed, but we put text below */}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-slate-100 line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors">{title}</h3>
        
        <div className="flex items-center justify-between mt-auto pt-2 text-sm text-slate-400">
          <span className="flex items-center">
            <Calendar className="w-4 h-4 mr-1 opacity-70" />
            {date ? date.substring(0, 4) : 'Unknown'}
          </span>
          <span className="flex items-center">
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            {item.vote_average?.toFixed(1) || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
