import redis.asyncio as redis
from app.core.config import settings

# Global Redis connection pool
redis_client = redis.from_url(
    settings.REDIS_URL,
    encoding="utf8",
    decode_responses=True
)

async def get_redis_client():
    return redis_client
