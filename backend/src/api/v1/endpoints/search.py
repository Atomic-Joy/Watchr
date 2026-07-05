from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional

from src.infrastructure.database.session import get_db
from src.application.services.metadata_service import MetadataService

router = APIRouter()

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
    
    return movie

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
    
    return tv_show
