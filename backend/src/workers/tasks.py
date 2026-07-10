import asyncio
import logging
from typing import Dict, Any

from src.workers.celery_app import celery_app
from src.infrastructure.tmdb_client import TMDBClient
# In a real implementation, we would import the MetadataService to handle the DB upsert
# from src.application.services.metadata_service import MetadataService

logger = logging.getLogger(__name__)

async def _sync_metadata_async(media_type: str, tmdb_id: int) -> Dict[str, Any]:
    from src.infrastructure.database.session import AsyncSessionLocal
    from src.application.services.metadata_service import MetadataService
    
    client = TMDBClient()
    
    async with AsyncSessionLocal() as session:
        service = MetadataService(session)
        
        if media_type == "movie":
            logger.info(f"Fetching movie metadata from TMDB for ID: {tmdb_id}")
            data = await client.get_movie(tmdb_id)
            await service.upsert_movie(data)
            logger.info(f"Successfully synced movie {data.get('title')} (ID: {tmdb_id})")
            return {"status": "success", "title": data.get("title")}
        elif media_type == "tv":
            logger.info(f"Fetching TV show metadata from TMDB for ID: {tmdb_id}")
            data = await client.get_tv_show(tmdb_id)
            
            # Fetch episodes for each season
            for season in data.get("seasons", []):
                season_num = season.get("season_number")
                if season_num is not None:
                    try:
                        season_details = await client.get_tv_season(tmdb_id, season_num)
                        season["episodes"] = season_details.get("episodes", [])
                    except Exception as e:
                        logger.error(f"Failed to fetch season {season_num} for TV show {tmdb_id}: {e}")
                        
            await service.upsert_tv_show(data)
            logger.info(f"Successfully synced TV show {data.get('name')} (ID: {tmdb_id})")
            return {"status": "success", "title": data.get("name")}
        else:
            raise ValueError(f"Unknown media type: {media_type}")

@celery_app.task(bind=True, max_retries=3)
def sync_metadata(self, media_type: str, tmdb_id: int):
    """
    Celery task to fetch metadata from TMDB and upsert into the local database.
    Runs asynchronously inside the synchronous Celery worker.
    """
    try:
        result = asyncio.run(_sync_metadata_async(media_type, tmdb_id))
        return result
    except Exception as exc:
        logger.error(f"Failed to sync {media_type} {tmdb_id}: {exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

async def _generate_release_notifications_async():
    from src.infrastructure.database.session import AsyncSessionLocal
    from src.application.services.notification_service import NotificationService
    
    async with AsyncSessionLocal() as session:
        await NotificationService.generate_release_notifications(session)

@celery_app.task(bind=True, max_retries=3)
def sync_release_notifications(self):
    """
    Celery task to generate release notifications for tracked TV shows.
    """
    try:
        asyncio.run(_generate_release_notifications_async())
        return {"status": "success"}
    except Exception as exc:
        logger.error(f"Failed to generate release notifications: {exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
