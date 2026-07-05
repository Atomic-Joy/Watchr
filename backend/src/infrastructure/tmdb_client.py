import httpx
import logging
from typing import Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from src.infrastructure.config import settings

logger = logging.getLogger(__name__)

class TMDBAPIError(Exception):
    """Exception raised for TMDB API errors."""
    pass

class TMDBRetryableError(TMDBAPIError):
    """Exception raised for TMDB API errors that should be retried (e.g. 429, 5xx)."""
    pass

class TMDBClient:
    def __init__(self):
        self.base_url = settings.TMDB_BASE_URL
        self.api_key = settings.TMDB_API_KEY
        self.headers = {
            "accept": "application/json"
        }
        # If it is a v4 Read Access Token (JWT/long string), send it in the Authorization header
        if self.api_key and len(self.api_key) != 32:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, TMDBRetryableError))
    )
    async def _request(self, method: str, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        query_params = params or {}
        
        # If it is a v3 API key (32 hex characters), pass it as a query parameter
        if self.api_key and len(self.api_key) == 32:
            query_params["api_key"] = self.api_key

        if not self.api_key:
            logger.warning("TMDB API Key is missing. The request may fail if authorization is required.")

        async with httpx.AsyncClient() as client:
            response = await client.request(method, url, params=query_params, headers=self.headers)
            
            if response.status_code == 429:
                logger.warning("TMDB Rate limit hit. Retrying...")
                raise TMDBRetryableError("Rate limit exceeded")
                
            if response.status_code >= 500:
                logger.error(f"TMDB Server error: {response.status_code} - {response.text}")
                raise TMDBRetryableError(f"HTTP {response.status_code}: {response.text}")
                
            if response.status_code >= 400:
                logger.error(f"TMDB API error: {response.status_code} - {response.text}")
                raise TMDBAPIError(f"HTTP {response.status_code}: {response.text}")

            return response.json()

    async def search_multi(self, query: str, page: int = 1) -> Dict[str, Any]:
        """Search for movies, tv shows and people in a single request."""
        endpoint = "/search/multi"
        params = {"query": query, "page": page, "include_adult": False}
        return await self._request("GET", endpoint, params)

    async def get_movie(self, movie_id: int) -> Dict[str, Any]:
        """Get movie details by ID."""
        endpoint = f"/movie/{movie_id}"
        return await self._request("GET", endpoint)

    async def get_tv_show(self, tv_id: int) -> Dict[str, Any]:
        """Get TV show details by ID."""
        endpoint = f"/tv/{tv_id}"
        return await self._request("GET", endpoint)

    async def get_tv_season(self, tv_id: int, season_number: int) -> Dict[str, Any]:
        """Get TV season details by TV ID and season number."""
        endpoint = f"/tv/{tv_id}/season/{season_number}"
        return await self._request("GET", endpoint)
