import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Film, Tv, Star, Calendar } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';

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
    <div className="space-y-8 animate-slide-up">
      {/* Search Header */}
      <div>
        <h1 className="font-serif italic text-4xl md:text-5xl text-brutal-white mb-2">Search</h1>
        <p className="text-brutal-gray text-xs uppercase tracking-[0.3em]">
          Explore the TMDB catalog
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brutal-gray pointer-events-none">
          <SearchIcon className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH MOVIES & TV SHOWS..."
          className="brutal-input pl-12 text-lg border-2 border-brutal-border focus:border-brutal-red"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-brutal-red border-t-transparent animate-spin"></div>
          </div>
        )}
      </div>

      {/* Error */}
      {isError && (
        <div className="border-2 border-brutal-red bg-brutal-red/10 p-4 text-brutal-red text-sm font-bold uppercase text-center">
          Failed to fetch results. Try again.
        </div>
      )}

      {/* No Results */}
      {!isLoading && !isError && data?.results?.length === 0 && debouncedQuery.length > 2 && (
        <div className="text-center py-16">
          <SearchIcon className="w-12 h-12 mx-auto text-brutal-border mb-4" />
          <p className="text-brutal-gray text-sm uppercase tracking-wider">
            No results for "{debouncedQuery}"
          </p>
        </div>
      )}

      {/* Placeholder */}
      {!isLoading && !isError && !data && debouncedQuery.length <= 2 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Film className="w-16 h-16 text-brutal-border mb-4" />
          <p className="text-brutal-gray text-sm uppercase tracking-wider">
            Type at least 3 characters to search
          </p>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {data?.results?.map((item: any) => (
          <MediaCard key={item.id} item={item} />
        ))}
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
    : null;

  return (
    <div className="brutal-card group cursor-pointer overflow-hidden">
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-brutal-mid overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isMovie ? (
              <Film className="w-10 h-10 text-brutal-border" />
            ) : (
              <Tv className="w-10 h-10 text-brutal-border" />
            )}
          </div>
        )}
        {/* Media Type Badge */}
        <div className={`absolute top-0 left-0 px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
          isMovie ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-green text-brutal-black'
        }`}>
          {isMovie ? 'Film' : 'TV'}
        </div>
        {/* Rating */}
        {item.vote_average > 0 && (
          <div className="absolute bottom-0 right-0 bg-brutal-black border-t-2 border-l-2 border-brutal-border px-2 py-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-brutal-yellow fill-brutal-yellow" />
            <span className="text-[11px] font-mono font-bold text-brutal-yellow">
              {item.vote_average.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 border-t-2 border-brutal-border">
        <h3 className="text-xs font-bold text-brutal-white uppercase tracking-wide line-clamp-1 group-hover:text-brutal-red transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-brutal-gray">
          <Calendar className="w-3 h-3" />
          <span className="text-[10px] font-mono">
            {date ? date.substring(0, 4) : '----'}
          </span>
        </div>
      </div>
    </div>
  );
}
