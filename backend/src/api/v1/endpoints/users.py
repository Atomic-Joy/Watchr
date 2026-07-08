from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid

from src.infrastructure.database.session import get_db
from src.domain.models.user import User
from src.domain.models.user_preference import UserPreference
from src.infrastructure.security import get_password_hash
from src.api.v1.deps import get_current_user

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_verified: bool

    class Config:
        from_attributes = True

class UserPreferenceSchema(BaseModel):
    timezone: str
    language: str
    adult_content: bool
    notification_email: bool
    notification_push: bool

    class Config:
        from_attributes = True

class UserPreferenceUpdate(BaseModel):
    timezone: Optional[str] = None
    language: Optional[str] = None
    adult_content: Optional[bool] = None
    notification_email: Optional[bool] = None
    notification_push: Optional[bool] = None

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user_in.password)
    user = User(email=user_in.email, password_hash=hashed_password)
    db.add(user)
    await db.flush() # flush to get user.id
    
    preferences = UserPreference(user_id=user.id)
    db.add(preferences)
    
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/me/preferences", response_model=UserPreferenceSchema)
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
    return prefs

@router.patch("/me/preferences", response_model=UserPreferenceSchema)
async def update_user_preferences(
    prefs_in: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == current_user.id))
    prefs = result.scalars().first()
    if not prefs:
        raise HTTPException(status_code=404, detail="Preferences not found")
        
    update_data = prefs_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
        
    await db.commit()
    await db.refresh(prefs)
    return prefs

class WatchHistoryItem(BaseModel):
    media_type: str
    watched_at: str
    title: str
    details: dict

    class Config:
        from_attributes = True

class WatchProgressItem(BaseModel):
    tv_show_id: uuid.UUID
    show_title: str
    progress_percent: float
    watched_episodes: int
    total_episodes: int
    last_watched_at: str

    class Config:
        from_attributes = True

@router.get("/me/history", response_model=List[WatchHistoryItem])
async def get_my_watch_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the user's complete watch history with media titles."""
    from src.domain.models.history import WatchHistory
    from src.domain.models.metadata import Movie, Episode, Season, TVShow
    
    stmt = select(WatchHistory).where(WatchHistory.user_id == current_user.id).order_by(WatchHistory.watched_at.desc())
    result = await db.execute(stmt)
    history_records = result.scalars().all()
    
    history_items = []
    for record in history_records:
        title = "Unknown"
        details = {}
        if record.media_type == "movie":
            m_res = await db.execute(select(Movie).where(Movie.id == record.media_id))
            movie = m_res.scalars().first()
            if movie:
                title = movie.title
                details = {"tmdb_id": movie.tmdb_id, "overview": movie.overview}
        elif record.media_type == "episode":
            e_res = await db.execute(
                select(Episode, Season, TVShow)
                .join(Season, Episode.season_id == Season.id)
                .join(TVShow, Season.tv_show_id == TVShow.id)
                .where(Episode.id == record.media_id)
            )
            row = e_res.first()
            if row:
                episode, season, tv_show = row
                title = f"{tv_show.title} - S{season.season_number:02d}E{episode.episode_number:02d}: {episode.title}"
                details = {
                    "show_title": tv_show.title,
                    "season_number": season.season_number,
                    "episode_number": episode.episode_number,
                    "episode_title": episode.title
                }
                
        history_items.append(WatchHistoryItem(
            media_type=record.media_type,
            watched_at=record.watched_at.isoformat(),
            title=title,
            details=details
        ))
        
    return history_items

@router.get("/me/progress", response_model=List[WatchProgressItem])
async def get_my_watch_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve overall watch progress for all tracked TV shows."""
    from src.domain.models.history import WatchProgress
    from src.domain.models.metadata import TVShow
    
    stmt = select(WatchProgress, TVShow).join(TVShow, WatchProgress.tv_show_id == TVShow.id).where(
        WatchProgress.user_id == current_user.id
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    progress_items = []
    for progress, tv_show in rows:
        progress_items.append(WatchProgressItem(
            tv_show_id=tv_show.id,
            show_title=tv_show.title,
            progress_percent=float(progress.progress_percent),
            watched_episodes=progress.watched_episodes or 0,
            total_episodes=progress.total_episodes or 0,
            last_watched_at=progress.last_watched_at.isoformat()
        ))
        
    return progress_items

@router.post("/me/progress/{tv_show_id}/watch-next")
async def mark_next_episode_watched(
    tv_show_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from src.domain.models.history import WatchProgress, WatchHistory
    from src.domain.models.metadata import Episode, Season
    from src.application.services.sync_service import SyncService
    from sqlalchemy import and_, or_
    import datetime
    
    # Get user's progress for this show
    stmt = select(WatchProgress).where(
        WatchProgress.user_id == current_user.id,
        WatchProgress.tv_show_id == tv_show_id
    )
    res = await db.execute(stmt)
    progress = res.scalars().first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="Watch progress not found for this show")

    next_ep_stmt = select(Episode).join(Season).where(Season.tv_show_id == tv_show_id)
    
    if progress.last_watched_episode_id:
        # Find last episode details
        last_ep_res = await db.execute(
            select(Episode, Season)
            .join(Season, Episode.season_id == Season.id)
            .where(Episode.id == progress.last_watched_episode_id)
        )
        last_row = last_ep_res.first()
        if last_row:
            last_ep, last_season = last_row
            # Next chronological episode
            next_ep_stmt = next_ep_stmt.where(
                or_(
                    and_(Season.season_number == last_season.season_number, Episode.episode_number == last_ep.episode_number + 1),
                    and_(Season.season_number == last_season.season_number + 1, Episode.episode_number == 1)
                )
            )
    else:
        # First episode
        next_ep_stmt = next_ep_stmt.where(Season.season_number == 1, Episode.episode_number == 1)

    next_ep_stmt = next_ep_stmt.order_by(Season.season_number.asc(), Episode.episode_number.asc()).limit(1)
    next_ep_res = await db.execute(next_ep_stmt)
    next_episode = next_ep_res.scalars().first()

    if not next_episode:
        raise HTTPException(status_code=404, detail="No unwatched episode found for this show (metadata might be missing)")

    # Record watch history
    now = datetime.datetime.now(datetime.timezone.utc)
    new_history = WatchHistory(
        user_id=current_user.id,
        media_type="episode",
        media_id=next_episode.id,
        watched_at=now,
        device_info="web"
    )
    db.add(new_history)
    await db.commit()

    # Recalculate progress
    sync_service = SyncService(db)
    await sync_service._recalculate_tv_show_progress(current_user.id, tv_show_id, next_episode.id, now)
    await db.commit()
    
    return {"message": "Next episode marked as watched", "episode_id": str(next_episode.id)}
