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
    return await NotificationService.get_user_notifications(db=db, user_id=current_user.id, limit=limit)

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
