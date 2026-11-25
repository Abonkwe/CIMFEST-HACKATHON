"""Lightweight thread-safe in-memory TTL cache for fast API reads (NFR-1)."""

from __future__ import annotations

import threading
import time
from typing import Any, Dict, Optional, Tuple

_LOCK = threading.Lock()
_STORE: Dict[str, Tuple[float, Any]] = {}


def get_cached(key: str) -> Optional[Any]:
    now = time.monotonic()
    with _LOCK:
        entry = _STORE.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if now >= expires_at:
            _STORE.pop(key, None)
            return None
        return value


def set_cached(key: str, value: Any, ttl_seconds: float = 20.0) -> None:
    expires_at = time.monotonic() + max(ttl_seconds, 0.0)
    with _LOCK:
        _STORE[key] = (expires_at, value)


def invalidate_cache(*prefixes: str) -> None:
    with _LOCK:
        if not prefixes:
            _STORE.clear()
            return
        keys_to_delete = [
            k for k in _STORE.keys() if any(k.startswith(prefix) for prefix in prefixes)
        ]
        for k in keys_to_delete:
            _STORE.pop(k, None)
