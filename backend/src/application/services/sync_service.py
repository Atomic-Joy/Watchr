import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from src.domain.models.user import User
from src.domain.models.metadata import Movie, TVShow, Season, Episode
from src.domain.models.history import WatchHistory, WatchProgress
from src.domain.models.social import Rating
from src.domain.models.sync_log import ClientSyncLog
from src.application.services.metadata_service import MetadataService
from src.infrastructure.tmdb_client import TMDBClient

logger = logging.getLogger(__name__)

class SyncLogItem(BaseModel):
    device_id: str
    action_type: str  # 'watch', 'unwatch', 'rate'
    media_type: str   # 'movie' or 'episode'
    tmdb_id: int      # TMDB ID of the Movie or the TV Show
    season_number: Optional[int] = None   # Required if media_type is 'episode'
    episode_number: Optional[int] = None  # Required if media_type is 'episode'
    rating_value: Optional[int] = None    # Required if action_type is 'rate'
    action_timestamp: datetime

class SyncService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.metadata_service = MetadataService(session)
        self.tmdb_client = TMDBClient()

    async def sync_client_logs(self, user: User, logs: List[SyncLogItem]) -> Dict[str, Any]:
        """
        Process batches of client sync logs chronologically.
        Reconciles offline watches, unwatches, and ratings.
        """
        # Sort logs by client action_timestamp (oldest first)
        sorted_logs = sorted(logs, key=lambda l: l.action_timestamp)
        
        processed_count = 0
        skipped_count = 0
        updated_shows = set() # Track TV show IDs to recalculate progress once at the end
        
        for log in sorted_logs:
            # 1. Deduplicate: check if this exact event from the device is already recorded
            dup_stmt = select(ClientSyncLog).where(
                ClientSyncLog.user_id == user.id,
                ClientSyncLog.device_id == log.device_id,
                ClientSyncLog.action_timestamp == log.action_timestamp,
                ClientSyncLog.action_type == log.action_type
            )
            dup_result = await self.session.execute(dup_stmt)
            if dup_result.scalars().first():
                skipped_count += 1
                continue

            # 2. Resolve media database UUID
            media_uuid = None
            tv_show_uuid = None
            
            if log.media_type == "movie":
                # Find or sync movie
                movie = await self.metadata_service.get_movie(log.tmdb_id)
                if not movie:
                    try:
                        movie_data = await self.tmdb_client.get_movie(log.tmdb_id)
                        movie = await self.metadata_service.upsert_movie(movie_data)
                    except Exception as e:
                        logger.error(f"Failed to sync metadata for movie {log.tmdb_id} during sync: {e}")
                        continue
                media_uuid = movie.id
                
            elif log.media_type == "episode":
                if log.season_number is None or log.episode_number is None:
                    logger.warning("Episode sync request missing season or episode number")
                    continue
                    
                # Find TV Show
                tv_show = await self.metadata_service.get_tv_show(log.tmdb_id)
                if not tv_show:
                    try:
                        tv_data = await self.tmdb_client.get_tv_show(log.tmdb_id)
                        tv_show = await self.metadata_service.upsert_tv_show(tv_data)
                    except Exception as e:
                        logger.error(f"Failed to sync metadata for TV show {log.tmdb_id} during sync: {e}")
                        continue
                
                tv_show_uuid = tv_show.id
                
                # Resolve Episode UUID
                ep_stmt = select(Episode).join(Season).where(
                    Season.tv_show_id == tv_show.id,
                    Season.season_number == log.season_number,
                    Episode.episode_number == log.episode_number
                )
                ep_result = await self.session.execute(ep_stmt)
                episode = ep_result.scalars().first()
                
                if not episode:
                    # Sync the season details on the fly
                    try:
                        full_season = await self.tmdb_client.get_tv_season(log.tmdb_id, log.season_number)
                        await self.metadata_service.upsert_season(tv_show.id, full_season)
                        
                        # Re-run selection
                        ep_result = await self.session.execute(ep_stmt)
                        episode = ep_result.scalars().first()
                    except Exception as e:
                        logger.error(f"Failed to sync season {log.season_number} for TV {log.tmdb_id}: {e}")
                        continue
                        
                if episode:
                    media_uuid = episode.id

            if not media_uuid:
                continue

            # 3. Apply Actions
            if log.action_type == "watch":
                # Add to watch history if not already watched at this exact time
                hist_stmt = select(WatchHistory).where(
                    WatchHistory.user_id == user.id,
                    WatchHistory.media_type == log.media_type,
                    WatchHistory.media_id == media_uuid,
                    WatchHistory.watched_at == log.action_timestamp
                )
                hist_res = await self.session.execute(hist_stmt)
                if not hist_res.scalars().first():
                    new_history = WatchHistory(
                        user_id=user.id,
                        media_type=log.media_type,
                        media_id=media_uuid,
                        watched_at=log.action_timestamp,
                        device_info=log.device_id
                    )
                    self.session.add(new_history)
                    
                if log.media_type == "episode" and tv_show_uuid:
                    updated_shows.add((tv_show_uuid, media_uuid, log.action_timestamp))

            elif log.action_type == "unwatch":
                # Remove watch history entries for this media
                del_stmt = delete(WatchHistory).where(
                    WatchHistory.user_id == user.id,
                    WatchHistory.media_type == log.media_type,
                    WatchHistory.media_id == media_uuid
                )
                await self.session.execute(del_stmt)
                
                if log.media_type == "episode" and tv_show_uuid:
                    updated_shows.add((tv_show_uuid, None, log.action_timestamp))

            elif log.action_type == "rate":
                if log.rating_value is not None:
                    # Upsert Rating
                    rate_stmt = select(Rating).where(
                        Rating.user_id == user.id,
                        Rating.media_type == log.media_type,
                        Rating.media_id == media_uuid
                    )
                    rate_res = await self.session.execute(rate_stmt)
                    db_rating = rate_res.scalars().first()
                    
                    if db_rating:
                        db_rating.rating = log.rating_value
                    else:
                        new_rating = Rating(
                            user_id=user.id,
                            media_type=log.media_type,
                            media_id=media_uuid,
                            rating=log.rating_value
                        )
                        self.session.add(new_rating)

            # Record in ClientSyncLog
            sync_log = ClientSyncLog(
                user_id=user.id,
                device_id=log.device_id,
                action_type=log.action_type,
                media_id=media_uuid,
                action_timestamp=log.action_timestamp
            )
            self.session.add(sync_log)
            processed_count += 1

        # 4. Recalculate Watch Progress for all affected TV Shows
        for tv_show_id, last_ep_id, timestamp in updated_shows:
            await self._recalculate_tv_show_progress(user.id, tv_show_id, last_ep_id, timestamp)
            
        await self.session.commit()
        return {
            "processed": processed_count,
            "skipped": skipped_count,
            "status": "success"
        }

    async def _recalculate_tv_show_progress(
        self, 
        user_uuid: uuid.UUID, 
        tv_show_uuid: uuid.UUID,
        last_episode_uuid: Optional[uuid.UUID],
        timestamp: datetime
    ) -> None:
        """Helper to calculate overall show watch percentage and update database."""
        # Get total number of episodes in the show
        total_ep_stmt = select(func.count(Episode.id)).join(Season).where(
            Season.tv_show_id == tv_show_uuid
        )
        total_ep_res = await self.session.execute(total_ep_stmt)
        total_episodes = total_ep_res.scalar() or 0
        
        if total_episodes == 0:
            return

        # Get total unique episodes watched by user for this show
        watched_stmt = select(func.count(func.distinct(Episode.id))).join(
            WatchHistory, WatchHistory.media_id == Episode.id
        ).join(Season).where(
            WatchHistory.user_id == user_uuid,
            WatchHistory.media_type == "episode",
            Season.tv_show_id == tv_show_uuid
        )
        watched_res = await self.session.execute(watched_stmt)
        watched_episodes = watched_res.scalar() or 0
        
        progress_percent = (watched_episodes / total_episodes) * 100.0
        
        # Check if progress record exists
        prog_stmt = select(WatchProgress).where(
            WatchProgress.user_id == user_uuid,
            WatchProgress.tv_show_id == tv_show_uuid
        )
        prog_res = await self.session.execute(prog_stmt)
        db_progress = prog_res.scalars().first()
        
        if db_progress:
            db_progress.progress_percent = progress_percent
            db_progress.last_watched_at = timestamp
            if last_episode_uuid:
                db_progress.last_watched_episode_id = last_episode_uuid
        else:
            new_progress = WatchProgress(
                user_id=user_uuid,
                tv_show_id=tv_show_uuid,
                last_watched_episode_id=last_episode_uuid,
                progress_percent=progress_percent,
                last_watched_at=timestamp
            )
            self.session.add(new_progress)
