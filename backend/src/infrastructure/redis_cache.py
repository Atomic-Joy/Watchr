import json
import logging
from typing import Any, Dict, Optional
import redis

from src.infrastructure.config import settings

logger = logging.getLogger(__name__)

class RedisCache:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.default_ttl = 3600 * 24 # 24 hours

    def get_cached_search(self, query: str) -> Optional[Dict[str, Any]]:
        """Retrieve search results from cache if they exist."""
        try:
            key = f"search:{query.strip().lower()}"
            cached_data = self.redis_client.get(key)
            if cached_data:
                logger.info(f"Redis cache hit for query: '{query}'")
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Failed to read from Redis cache: {e}")
        return None

    def cache_search(self, query: str, results: Dict[str, Any], ttl: int = None) -> None:
        """Store search results in the cache."""
        try:
            key = f"search:{query.strip().lower()}"
            ttl = ttl or self.default_ttl
            self.redis_client.setex(key, ttl, json.dumps(results))
            logger.info(f"Cached search results in Redis for query: '{query}'")
        except Exception as e:
            logger.error(f"Failed to write to Redis cache: {e}")

    def invalidate_search_cache(self) -> None:
        """Clear all search-related cache keys."""
        try:
            keys = self.redis_client.keys("search:*")
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} search cache entries")
        except Exception as e:
            logger.error(f"Failed to invalidate Redis cache: {e}")
