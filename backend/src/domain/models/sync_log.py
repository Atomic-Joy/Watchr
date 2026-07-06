import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.domain.models.base import Base

class ClientSyncLog(Base):
    __tablename__ = "client_sync_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(String(100), nullable=False)
    action_type = Column(String(50), nullable=False) # 'watch', 'unwatch', 'rate'
    media_id = Column(UUID(as_uuid=True), nullable=False)
    action_timestamp = Column(DateTime(timezone=True), nullable=False)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sync_logs")
