"""Unit tests for the in-memory sliding-window rate limiter."""

from unittest.mock import patch

from services.rate_limit import SlidingWindowRateLimiter, retry_message


def test_allows_up_to_limit_then_blocks():
    limiter = SlidingWindowRateLimiter()
    with patch("services.rate_limit.time", return_value=1_000.0):
        assert limiter.hit("u1", limit=2, window_seconds=3600) == (True, 0)
        assert limiter.hit("u1", limit=2, window_seconds=3600) == (True, 0)
        allowed, retry_after = limiter.hit("u1", limit=2, window_seconds=3600)
    assert allowed is False
    assert retry_after >= 1


def test_keys_are_independent():
    limiter = SlidingWindowRateLimiter()
    with patch("services.rate_limit.time", return_value=1_000.0):
        assert limiter.hit("a", limit=1, window_seconds=3600)[0] is True
        assert limiter.hit("a", limit=1, window_seconds=3600)[0] is False
        assert limiter.hit("b", limit=1, window_seconds=3600)[0] is True


def test_window_expiry_allows_new_hits():
    limiter = SlidingWindowRateLimiter()
    with patch("services.rate_limit.time", return_value=1_000.0):
        limiter.hit("u1", limit=1, window_seconds=60)
        assert limiter.hit("u1", limit=1, window_seconds=60)[0] is False
    with patch("services.rate_limit.time", return_value=1_061.0):
        assert limiter.hit("u1", limit=1, window_seconds=60) == (True, 0)


def test_limit_below_one_disables_limiting():
    limiter = SlidingWindowRateLimiter()
    for _ in range(10):
        assert limiter.hit("u1", limit=0, window_seconds=3600) == (True, 0)


def test_retry_message_hour_window():
    msg = retry_message(retry_after=125, limit=5, window_seconds=3600)
    assert "5 resumes per hour" in msg
    assert "3 minutes" in msg
