import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.domain.models.metadata import Movie, TVShow
from src.infrastructure.tmdb_client import TMDBClient
from src.workers.tasks import sync_metadata

logger = logging.getLogger(__name__)

class MetadataService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tmdb_client = TMDBClient()

    async def search(self, query: str) -> Dict[str, Any]:
        """
        Local-first search implementation.
        For now, this searches TMDB directly and queues sync tasks for the results,
        while returning the TMDB results to the user for immediate display.
        In a fully localized environment, it would search Postgres first.
        """
        # Step 1: Query TMDB for multi-search results
        results = await self.tmdb_client.search_multi(query)
        
        # Step 2: Enqueue background tasks to sync the detailed metadata for top results
        # We only sync movies and tv shows, not people.
        items = results.get("results", [])
        sync_count = 0
        
        for item in items[:10]: # Limit to top 10 to avoid flooding the queue
            media_type = item.get("media_type")
            tmdb_id = item.get("id")
            
            if media_type in ["movie", "tv"] and tmdb_id:
                # Enqueue Celery task
                sync_metadata.delay(media_type, tmdb_id)
                sync_count += 1
                
        logger.info(f"Enqueued {sync_count} sync tasks for search query: '{query}'")
        
        # Return the original TMDB response so the frontend can display it immediately
        return results

    async def get_movie(self, movie_id: int) -> Optional[Movie]:
        """Get movie from local database, or enqueue sync if missing."""
        result = await self.session.execute(select(Movie).where(Movie.tmdb_id == movie_id))
        movie = result.scalars().first()
        
        if not movie:
            logger.info(f"Movie {movie_id} not found locally. Enqueuing sync task.")
            sync_metadata.delay("movie", movie_id)
            
        return movie

    async def get_tv_show(self, tv_id: int) -> Optional[TVShow]:
        """Get TV show from local database, or enqueue sync if missing."""
        result = await self.session.execute(select(TVShow).where(TVShow.tmdb_id == tv_id))
        tv_show = result.scalars().first()
        
        if not tv_show:
            logger.info(f"TV show {tv_id} not found locally. Enqueuing sync task.")
            sync_metadata.delay("tv", tv_id)
            
        return tv_show
