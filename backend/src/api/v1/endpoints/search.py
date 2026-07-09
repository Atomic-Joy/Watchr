from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ConfigDict
import datetime
import uuid

from src.infrastructure.database.session import get_db
from src.application.services.metadata_service import MetadataService

router = APIRouter()

class MovieSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    release_date: Optional[datetime.date] = None
    runtime: Optional[int] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    vote_average: Optional[float] = None

class EpisodeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tmdb_id: int
    episode_number: int
    title: str
    overview: Optional[str] = None
    air_date: Optional[datetime.date] = None
    runtime: Optional[int] = None
    still_path: Optional[str] = None

class SeasonSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tmdb_id: int
    season_number: int
    episode_count: int
    air_date: Optional[datetime.date] = None
    poster_path: Optional[str] = None
    episodes: List[EpisodeSchema] = []

class TVShowSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    first_air_date: Optional[datetime.date] = None
    status: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    vote_average: Optional[float] = None
    seasons: List[SeasonSchema] = []

@router.get("/search")
async def search_metadata(
    query: str = Query(..., min_length=2, description="Search query for movies/tv shows"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Search for movies and TV shows across the platform.
    Locally caches and queues background syncs for found items.
    """
    service = MetadataService(db)
    return await service.search(query)

@router.get("/movies/{movie_id}")
async def get_movie(
    movie_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get movie details by TMDB ID.
    """
    service = MetadataService(db)
    movie = await service.get_movie(movie_id)
    if not movie:
        return {"status": "syncing", "message": "Movie is being synced from TMDB."}
    
    return MovieSchema.model_validate(movie)

@router.get("/tv/{tv_id}")
async def get_tv_show(
    tv_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get TV show details by TMDB ID.
    """
    service = MetadataService(db)
    tv_show = await service.get_tv_show(tv_id)
    if not tv_show:
        return {"status": "syncing", "message": "TV show is being synced from TMDB."}
    
    # Sort seasons and episodes
    tv_show.seasons.sort(key=lambda x: x.season_number)
    for season in tv_show.seasons:
        season.episodes.sort(key=lambda x: x.episode_number)
        
    return TVShowSchema.model_validate(tv_show)
