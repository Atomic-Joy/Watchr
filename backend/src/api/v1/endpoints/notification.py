from typing import List, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from src.infrastructure.database.session import get_db
from src.api.v1.deps import get_current_user
from src.domain.models.user import User
from src.application.services.notification_service import NotificationService

router = APIRouter()

class ReleaseNotificationResponse(BaseModel):
    id: UUID
    media_type: str
    media_id: UUID
    tmdb_id: int
    show_title: str
    season_number: int
    episode_number: int
    episode_title: str
    poster_path: str | None
    release_date: datetime
    message: str
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ReleaseNotificationResponse])
async def get_notifications(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get all pull-based notifications dynamically generated for the current user.
    This fetches ReleaseNotifications matching their active WatchProgress.
    """
    import re
    from datetime import datetime, timezone
    
    rows = await NotificationService.get_user_notifications(db=db, user_id=current_user.id, limit=limit)
    responses = []
    
    pattern = re.compile(r"New episode of (.*?): Season (\d+) Episode (\d+) - (.*?) airs on (.*?)\.")
    
    for notification, tv_show in rows:
        match = pattern.search(notification.message)
        if match:
            show_title = match.group(1)
            season_number = int(match.group(2))
            episode_number = int(match.group(3))
            episode_title = match.group(4)
            air_date_str = match.group(5)
            # Parse the extracted string to a datetime object in UTC
            # TMDB returns the origin country date (e.g. US). 
            # We add 25 hours to simulate a standard 9 PM EDT release (which is 01:00 UTC the next day).
            from datetime import timedelta
            try:
                base_date = datetime.strptime(air_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                extracted_date = base_date + timedelta(hours=25)
            except ValueError:
                extracted_date = notification.release_date
        else:
            show_title = tv_show.title
            season_number = 0
            episode_number = 0
            episode_title = "Unknown"
            extracted_date = notification.release_date
            
        responses.append(ReleaseNotificationResponse(
            id=notification.id,
            media_type=notification.media_type,
            media_id=notification.media_id,
            tmdb_id=tv_show.tmdb_id,
            show_title=show_title,
            season_number=season_number,
            episode_number=episode_number,
            episode_title=episode_title,
            poster_path=tv_show.poster_path,
            release_date=extracted_date,
            message=notification.message,
            created_at=notification.created_at
        ))
        
    return responses

@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Mark a specific notification as read.
    """
    await NotificationService.mark_as_read(db=db, user_id=current_user.id, notification_id=notification_id)
    return {"message": "Notification marked as read"}
