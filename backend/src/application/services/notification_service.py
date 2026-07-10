from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, distinct
import logging
from datetime import datetime, timezone

from src.domain.models.notification import ReleaseNotification, UserNotification
from src.domain.models.history import WatchProgress
from src.domain.models.metadata import TVShow
from src.infrastructure.tmdb_client import TMDBClient

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def get_user_notifications(db: AsyncSession, user_id: UUID, limit: int = 50) -> List[tuple]:
        """
        Dynamically pull release notifications for shows the user is currently watching.
        It joins ReleaseNotification with the user's WatchProgress based on media_id matching tv_show_id.
        """
        from sqlalchemy import asc
        
        stmt = (
            select(ReleaseNotification, TVShow)
            .join(
                WatchProgress,
                and_(
                    WatchProgress.user_id == user_id,
                    WatchProgress.tv_show_id == ReleaseNotification.media_id,
                    ReleaseNotification.media_type == 'episode'
                )
            )
            .join(TVShow, TVShow.id == ReleaseNotification.media_id)
            .order_by(asc(ReleaseNotification.release_date))
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        return result.all()
    
    @staticmethod
    async def mark_as_read(db: AsyncSession, user_id: UUID, notification_id: UUID) -> UserNotification:
        """
        Marks a specific notification as read by creating a UserNotification record.
        """
        stmt = select(UserNotification).where(
            UserNotification.user_id == user_id, 
            UserNotification.notification_id == notification_id
        )
        result = await db.execute(stmt)
        user_notif = result.scalars().first()

        if not user_notif:
            user_notif = UserNotification(
                user_id=user_id,
                notification_id=notification_id,
                is_read=True
            )
            db.add(user_notif)
            await db.commit()
            await db.refresh(user_notif)
        elif not user_notif.is_read:
            user_notif.is_read = True
            await db.commit()
            await db.refresh(user_notif)
            
        return user_notif
        
    @staticmethod
    async def generate_release_notifications(db: AsyncSession):
        """
        Poll upcoming release schedules of user-tracked shows and populate release notification ledgers.
        This fetches the active shows, checks their next_episode_to_air from TMDB, and creates
        a ReleaseNotification.
        """
        # Get all distinct TV Shows being tracked by users
        stmt = select(distinct(WatchProgress.tv_show_id))
        result = await db.execute(stmt)
        tracked_tv_show_ids = result.scalars().all()
        
        client = TMDBClient()
        
        for show_id in tracked_tv_show_ids:
            show_stmt = select(TVShow).where(TVShow.id == show_id)
            show_res = await db.execute(show_stmt)
            show = show_res.scalars().first()
            if not show or not show.tmdb_id:
                continue
                
            try:
                tmdb_data = await client.get_tv_show(show.tmdb_id)
                next_episode = tmdb_data.get('next_episode_to_air')
                
                if next_episode:
                    air_date_str = next_episode.get('air_date')
                    if not air_date_str:
                        continue
                    
                    air_date = datetime.strptime(air_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    
                    # Check if notification already exists for this episode to prevent duplicates
                    dup_stmt = select(ReleaseNotification).where(
                        ReleaseNotification.media_id == show.id,
                        ReleaseNotification.media_type == 'episode',
                        ReleaseNotification.release_date == air_date
                    )
                    dup_res = await db.execute(dup_stmt)
                    existing = dup_res.scalars().first()
                    
                    if not existing:
                        season_num = next_episode.get('season_number')
                        episode_num = next_episode.get('episode_number')
                        title = next_episode.get('name')
                        
                        message = f"New episode of {show.title}: Season {season_num} Episode {episode_num} - {title} airs on {air_date_str}."
                        
                        notification = ReleaseNotification(
                            media_type='episode',
                            media_id=show.id,
                            release_date=air_date,
                            message=message
                        )
                        db.add(notification)
                        await db.commit()
                        logger.info(f"Created release notification for {show.title} S{season_num}E{episode_num}")
                        
            except Exception as e:
                logger.error(f"Error generating release notification for TV Show {show.id}: {e}")
                await db.rollback()
