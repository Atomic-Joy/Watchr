from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from src.infrastructure.database.session import get_db
from src.domain.models.user import User
from src.application.services.sync_service import SyncService, SyncLogItem
from src.api.v1.deps import get_current_user

router = APIRouter()

@router.post("/push", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def push_sync_logs(
    logs: List[SyncLogItem],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Push client activity logs for server reconciliation.
    Reconciles watch history, unwatches, and ratings.
    """
    service = SyncService(db)
    return await service.sync_client_logs(current_user, logs)
