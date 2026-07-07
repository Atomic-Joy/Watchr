from celery import Celery
from src.infrastructure.config import settings

celery_app = Celery(
    "trakt_clone_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["src.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
)

from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'generate-release-notifications-daily': {
        'task': 'src.workers.tasks.sync_release_notifications',
        'schedule': crontab(hour=0, minute=0), # Run daily at midnight UTC
    },
}
