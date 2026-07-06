import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.domain.models.base import Base

class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    media_type = Column(String(10), nullable=False) # 'movie' or 'episode'
    media_id = Column(UUID(as_uuid=True), nullable=False) # Points to movies(id) or episodes(id)
    watched_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_seconds = Column(Integer, default=0)
    completed = Column(Boolean, default=True)
    device_info = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="watch_history")

class WatchProgress(Base):
    __tablename__ = "watch_progress"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    tv_show_id = Column(UUID(as_uuid=True), ForeignKey("tv_shows.id", ondelete="CASCADE"), primary_key=True)
    last_watched_episode_id = Column(UUID(as_uuid=True), ForeignKey("episodes.id", ondelete="SET NULL"), nullable=True)
    progress_percent = Column(Numeric(5, 2), default=0.00)
    last_watched_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="watch_progress")
    tv_show = relationship("TVShow")
    last_watched_episode = relationship("Episode")
