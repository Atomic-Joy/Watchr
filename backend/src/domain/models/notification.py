import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.domain.models.base import Base

class ReleaseNotification(Base):
    __tablename__ = "release_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_type = Column(String(50), nullable=False) # 'movie' or 'episode'
    media_id = Column(UUID(as_uuid=True), nullable=False) # Reference to movies or episodes table
    release_date = Column(DateTime(timezone=True), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserNotification(Base):
    __tablename__ = "user_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_id = Column(UUID(as_uuid=True), ForeignKey("release_notifications.id", ondelete="CASCADE"), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
    notification = relationship("ReleaseNotification")
