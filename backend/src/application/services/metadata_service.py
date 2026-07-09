import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert

from src.domain.models.metadata import Movie, TVShow, Season, Episode
from src.infrastructure.tmdb_client import TMDBClient
from src.infrastructure.redis_cache import RedisCache

logger = logging.getLogger(__name__)

class MetadataService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tmdb_client = TMDBClient()
        self.redis_cache = RedisCache()

    async def search(self, query: str) -> Dict[str, Any]:
        """
        Local-first search implementation.
        Queries Redis first, then Postgres, and falls back to TMDB if empty.
        """
        # Step 0: Check Redis cache
        cached_results = self.redis_cache.get_cached_search(query)
        if cached_results:
            return cached_results

        # Step 1: Query local database
        movie_stmt = select(Movie).where(Movie.title.ilike(f"%{query}%")).limit(10)
        tv_stmt = select(TVShow).where(TVShow.title.ilike(f"%{query}%")).limit(10)
        
        movie_result = await self.session.execute(movie_stmt)
        tv_result = await self.session.execute(tv_stmt)
        
        local_movies = movie_result.scalars().all()
        local_tv = tv_result.scalars().all()
        
        # If we have local results, format and return them
        if local_movies or local_tv:
            results = []
            for m in local_movies:
                results.append({
                    "id": m.tmdb_id,
                    "media_type": "movie",
                    "title": m.title,
                    "original_title": m.original_title,
                    "overview": m.overview,
                    "release_date": str(m.release_date) if m.release_date else None,
                    "poster_path": m.poster_path,
                    "backdrop_path": m.backdrop_path,
                    "vote_average": float(m.vote_average) if m.vote_average else 0.0,
                    "vote_count": m.vote_count
                })
            for t in local_tv:
                results.append({
                    "id": t.tmdb_id,
                    "media_type": "tv",
                    "name": t.title,
                    "overview": t.overview,
                    "first_air_date": str(t.first_air_date) if t.first_air_date else None,
                    "poster_path": t.poster_path,
                    "backdrop_path": t.backdrop_path,
                    "vote_average": float(t.vote_average) if t.vote_average else 0.0,
                    "vote_count": t.vote_count
                })
            res = {"results": results, "source": "local"}
            self.redis_cache.cache_search(query, res)
            return res

        # Step 2: Fallback to TMDB for multi-search results
        logger.info(f"Local cache miss for query '{query}'. Querying TMDB...")
        results = await self.tmdb_client.search_multi(query)
        results["source"] = "tmdb"
        
        # Cache the TMDB results
        self.redis_cache.cache_search(query, results)
        
        # Step 3: Enqueue background tasks to sync detailed metadata for top results
        from src.workers.tasks import sync_metadata
        items = results.get("results", [])
        sync_count = 0
        
        for item in items[:10]:
            media_type = item.get("media_type")
            tmdb_id = item.get("id")
            
            if media_type in ["movie", "tv"] and tmdb_id:
                sync_metadata.delay(media_type, tmdb_id)
                sync_count += 1
                
        logger.info(f"Enqueued {sync_count} sync tasks for search query: '{query}'")
        return results

    async def get_movie(self, movie_id: int) -> Optional[Movie]:
        """Get movie from local database, or enqueue sync if missing."""
        result = await self.session.execute(select(Movie).where(Movie.tmdb_id == movie_id))
        movie = result.scalars().first()
        
        if not movie:
            logger.info(f"Movie {movie_id} not found locally. Enqueuing sync task.")
            from src.workers.tasks import sync_metadata
            sync_metadata.delay("movie", movie_id)
            
        return movie

    async def get_tv_show(self, tv_id: int) -> Optional[TVShow]:
        """Get TV show from local database, or enqueue sync if missing."""
        result = await self.session.execute(
            select(TVShow)
            .options(selectinload(TVShow.seasons).selectinload(Season.episodes))
            .where(TVShow.tmdb_id == tv_id)
        )
        tv_show = result.scalars().first()
        
        if not tv_show:
            logger.info(f"TV show {tv_id} not found locally. Enqueuing sync task.")
            from src.workers.tasks import sync_metadata
            sync_metadata.delay("tv", tv_id)
            
        return tv_show

    async def upsert_movie(self, data: Dict[str, Any]) -> Movie:
        """Upsert detailed movie metadata from TMDB."""
        # Parse date
        release_date = None
        if data.get("release_date"):
            try:
                release_date = datetime.strptime(data["release_date"], "%Y-%m-%d").date()
            except ValueError:
                pass

        stmt = insert(Movie).values(
            tmdb_id=data["id"],
            imdb_id=data.get("imdb_id"),
            title=data["title"],
            original_title=data.get("original_title"),
            overview=data.get("overview"),
            release_date=release_date,
            runtime=data.get("runtime"),
            poster_path=data.get("poster_path"),
            backdrop_path=data.get("backdrop_path"),
            vote_average=data.get("vote_average"),
            vote_count=data.get("vote_count", 0),
            status=data.get("status")
        )
        
        # Handle conflict update
        update_cols = {c.name: c for c in stmt.excluded if c.name not in ["id", "created_at"]}
        stmt = stmt.on_conflict_do_update(
            index_elements=["tmdb_id"],
            set_=update_cols
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        result = await self.session.execute(select(Movie).where(Movie.tmdb_id == data["id"]))
        return result.scalars().one()

    async def upsert_tv_show(self, data: Dict[str, Any]) -> TVShow:
        """Upsert detailed TV show metadata, including all seasons and episodes."""
        first_air_date = None
        if data.get("first_air_date"):
            try:
                first_air_date = datetime.strptime(data["first_air_date"], "%Y-%m-%d").date()
            except ValueError:
                pass
                
        last_air_date = None
        if data.get("last_air_date"):
            try:
                last_air_date = datetime.strptime(data["last_air_date"], "%Y-%m-%d").date()
            except ValueError:
                pass

        stmt = insert(TVShow).values(
            tmdb_id=data["id"],
            imdb_id=data.get("imdb_id"),
            title=data["name"],
            overview=data.get("overview"),
            first_air_date=first_air_date,
            last_air_date=last_air_date,
            status=data.get("status"),
            poster_path=data.get("poster_path"),
            backdrop_path=data.get("backdrop_path"),
            vote_average=data.get("vote_average"),
            vote_count=data.get("vote_count", 0)
        )
        
        # Handle conflict update
        update_cols = {c.name: c for c in stmt.excluded if c.name not in ["id", "created_at"]}
        stmt = stmt.on_conflict_do_update(
            index_elements=["tmdb_id"],
            set_=update_cols
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        # Retrieve TVShow database instance
        db_show_result = await self.session.execute(select(TVShow).where(TVShow.tmdb_id == data["id"]))
        db_show = db_show_result.scalars().one()
        
        # Sync seasons and episodes
        seasons = data.get("seasons", [])
        for season_data in seasons:
            season_num = season_data.get("season_number")
            if season_num is None:
                continue
                
            try:
                # Fetch full season details including episode list
                full_season = await self.tmdb_client.get_tv_season(data["id"], season_num)
                await self.upsert_season(db_show.id, full_season)
            except Exception as e:
                logger.error(f"Failed to sync season {season_num} for show {db_show.title}: {e}")
                
        return db_show

    async def upsert_season(self, tv_show_uuid: Any, season_data: Dict[str, Any]) -> Season:
        """Upsert detailed Season and its corresponding episodes."""
        air_date = None
        if season_data.get("air_date"):
            try:
                air_date = datetime.strptime(season_data["air_date"], "%Y-%m-%d").date()
            except ValueError:
                pass

        stmt = insert(Season).values(
            tv_show_id=tv_show_uuid,
            tmdb_id=season_data["id"],
            season_number=season_data["season_number"],
            episode_count=len(season_data.get("episodes", [])),
            air_date=air_date,
            poster_path=season_data.get("poster_path")
        )
        
        update_cols = {c.name: c for c in stmt.excluded if c.name not in ["id", "created_at"]}
        stmt = stmt.on_conflict_do_update(
            index_elements=["tmdb_id"],
            set_=update_cols
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        db_season_result = await self.session.execute(select(Season).where(Season.tmdb_id == season_data["id"]))
        db_season = db_season_result.scalars().one()
        
        # Sync episodes in this season
        episodes = season_data.get("episodes", [])
        for ep_data in episodes:
            await self.upsert_episode(db_season.id, ep_data)
            
        return db_season

    async def upsert_episode(self, season_uuid: Any, ep_data: Dict[str, Any]) -> Episode:
        """Upsert detailed Episode."""
        air_date = None
        if ep_data.get("air_date"):
            try:
                air_date = datetime.strptime(ep_data["air_date"], "%Y-%m-%d").date()
            except ValueError:
                pass

        stmt = insert(Episode).values(
            season_id=season_uuid,
            tmdb_id=ep_data["id"],
            episode_number=ep_data["episode_number"],
            absolute_number=ep_data.get("show_id"), # Absolute numbering if maps to show_id or absolute
            title=ep_data.get("name", f"Episode {ep_data['episode_number']}"),
            overview=ep_data.get("overview"),
            air_date=air_date,
            runtime=ep_data.get("runtime"),
            still_path=ep_data.get("still_path")
        )
        
        update_cols = {c.name: c for c in stmt.excluded if c.name not in ["id", "created_at"]}
        stmt = stmt.on_conflict_do_update(
            index_elements=["tmdb_id"],
            set_=update_cols
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
        
        db_episode_result = await self.session.execute(select(Episode).where(Episode.tmdb_id == ep_data["id"]))
        return db_episode_result.scalars().one()

