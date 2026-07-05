import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Boolean, Date, Numeric, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from .base import Base

class Movie(Base):
    __tablename__ = "movies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    imdb_id: Mapped[Optional[str]] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    original_title: Mapped[Optional[str]] = mapped_column(String(500))
    overview: Mapped[Optional[str]] = mapped_column(Text)
    release_date: Mapped[Optional[date]] = mapped_column(Date)
    runtime: Mapped[Optional[int]] = mapped_column(Integer) # in minutes
    poster_path: Mapped[Optional[str]] = mapped_column(String(255))
    backdrop_path: Mapped[Optional[str]] = mapped_column(String(255))
    vote_average: Mapped[Optional[float]] = mapped_column(Numeric(3, 1))
    vote_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TVShow(Base):
    __tablename__ = "tv_shows"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    imdb_id: Mapped[Optional[str]] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    overview: Mapped[Optional[str]] = mapped_column(Text)
    first_air_date: Mapped[Optional[date]] = mapped_column(Date)
    last_air_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[Optional[str]] = mapped_column(String(50))
    poster_path: Mapped[Optional[str]] = mapped_column(String(255))
    backdrop_path: Mapped[Optional[str]] = mapped_column(String(255))
    vote_average: Mapped[Optional[float]] = mapped_column(Numeric(3, 1))
    vote_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    seasons: Mapped[list["Season"]] = relationship("Season", back_populates="tv_show", cascade="all, delete-orphan")

class Season(Base):
    __tablename__ = "seasons"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tv_show_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tv_shows.id", ondelete="CASCADE"), nullable=False)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    season_number: Mapped[int] = mapped_column(Integer, nullable=False)
    episode_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    air_date: Mapped[Optional[date]] = mapped_column(Date)
    poster_path: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tv_show: Mapped["TVShow"] = relationship("TVShow", back_populates="seasons")
    episodes: Mapped[list["Episode"]] = relationship("Episode", back_populates="season", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('tv_show_id', 'season_number', name='unique_show_season'),)

class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    absolute_number: Mapped[Optional[int]] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    overview: Mapped[Optional[str]] = mapped_column(Text)
    air_date: Mapped[Optional[date]] = mapped_column(Date)
    runtime: Mapped[Optional[int]] = mapped_column(Integer)
    still_path: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    season: Mapped["Season"] = relationship("Season", back_populates="episodes")

    __table_args__ = (UniqueConstraint('season_id', 'episode_number', name='unique_season_episode'),)
