"""Redis client — shared connection pool for rate limiting, caching, token blacklist."""

import json
import logging
import time
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return the shared Redis connection (lazy-initialised)."""
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _redis


async def close_redis() -> None:
    """Gracefully close the Redis connection pool."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


async def redis_ping() -> bool:
    """Check Redis connectivity. Returns False on failure."""
    try:
        r = await get_redis()
        return await r.ping()
    except Exception:
        return False


# ── Rate Limiting (sliding window via sorted sets) ───────────────────────

async def check_rate_limit(key: str, limit: int, window: int = 60) -> tuple[bool, int]:
    """
    Sliding-window rate limit using Redis sorted sets.
    Returns (allowed: bool, remaining: int).
    """
    r = await get_redis()
    now = time.time()
    window_start = now - window

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window)
    results = await pipe.execute()

    count = results[2]
    remaining = max(0, limit - count)
    allowed = count <= limit
    return allowed, remaining


# ── Token Blacklist ──────────────────────────────────────────────────────

_BLACKLIST_PREFIX = "bl:"


async def blacklist_token(jti: str, ttl_seconds: int) -> None:
    """Add a token ID to the blacklist. Auto-expires when the JWT would."""
    r = await get_redis()
    await r.setex(f"{_BLACKLIST_PREFIX}{jti}", ttl_seconds, "1")


async def is_token_blacklisted(jti: str) -> bool:
    """Check whether a JWT has been revoked."""
    r = await get_redis()
    return await r.exists(f"{_BLACKLIST_PREFIX}{jti}") > 0


# ── Generic Cache (tool results, etc.) ───────────────────────────────────

_CACHE_PREFIX = "cache:"


async def cache_get(key: str) -> Any | None:
    """Retrieve a JSON-serialisable value from cache."""
    r = await get_redis()
    raw = await r.get(f"{_CACHE_PREFIX}{key}")
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


async def cache_set(key: str, value: Any, ttl: int = 30) -> None:
    """Store a JSON-serialisable value with TTL (seconds)."""
    r = await get_redis()
    await r.setex(f"{_CACHE_PREFIX}{key}", ttl, json.dumps(value, default=str))


async def cache_delete(key: str) -> None:
    """Remove a single cache entry."""
    r = await get_redis()
    await r.delete(f"{_CACHE_PREFIX}{key}")


# ── Conversation Context Cache ───────────────────────────────────────────

_CTX_PREFIX = "ctx:"
_CTX_TTL = 1800  # 30 minutes


async def cache_conversation_context(conversation_id: str, messages: list[dict]) -> None:
    """Cache the recent message window for an active conversation."""
    r = await get_redis()
    trimmed = messages[-20:]  # keep last 20 messages to bound size
    await r.setex(f"{_CTX_PREFIX}{conversation_id}", _CTX_TTL, json.dumps(trimmed, default=str))


async def get_conversation_context(conversation_id: str) -> list[dict] | None:
    """Retrieve cached context. Returns None if expired or missing."""
    r = await get_redis()
    raw = await r.get(f"{_CTX_PREFIX}{conversation_id}")
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


async def invalidate_conversation_context(conversation_id: str) -> None:
    """Remove cached context for a conversation."""
    r = await get_redis()
    await r.delete(f"{_CTX_PREFIX}{conversation_id}")
