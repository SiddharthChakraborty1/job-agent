"""In-memory sliding-window rate limiter (single-process)."""

from collections import defaultdict, deque
from threading import Lock
from time import time


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def hit(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        """Record a hit if under the limit.

        Returns (allowed, retry_after_seconds). retry_after_seconds is 0 when allowed.
        A limit less than 1 disables limiting (always allowed).
        """
        if limit < 1 or window_seconds < 1:
            return True, 0

        now = time()
        with self._lock:
            hits = self._hits[key]
            cutoff = now - window_seconds
            while hits and hits[0] <= cutoff:
                hits.popleft()

            if len(hits) >= limit:
                retry_after = int(hits[0] + window_seconds - now) + 1
                return False, max(retry_after, 1)

            hits.append(now)
            return True, 0


upload_limiter = SlidingWindowRateLimiter()


def retry_message(retry_after: int, limit: int, window_seconds: int) -> str:
    if retry_after < 60:
        wait = f"{retry_after} second{'s' if retry_after != 1 else ''}"
    else:
        minutes = (retry_after + 59) // 60
        wait = f"{minutes} minute{'s' if minutes != 1 else ''}"

    if window_seconds == 3600:
        period = "hour"
    else:
        period = f"{window_seconds}-second window"

    noun = "resume" if limit == 1 else "resumes"
    return (
        f"Upload limit reached. You can upload {limit} {noun} per {period}. "
        f"Try again in {wait}."
    )
