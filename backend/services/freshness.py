"""Posting freshness: drop stale jobs and penalise age when ranking.

The fit score (alignment_score) measures fit only and is never changed here.
Age affects which jobs survive and their order.
"""

from __future__ import annotations

import logging
from datetime import date

from models.schemas import JobResult

logger = logging.getLogger(__name__)

# Search Google for pages indexed within this window (dork after: cutoff).
SEARCH_WINDOW_DAYS = 14
# Drop postings older than this. Undated postings are kept but penalised.
MAX_POSTING_AGE_DAYS = 14
# No ranking penalty while a posting is this fresh.
FRESH_DAYS = 3
# Fit points subtracted per day of age beyond FRESH_DAYS.
PENALTY_PER_DAY = 2
# Undated postings are ranked as if they were this many days old.
UNDATED_ASSUMED_AGE_DAYS = 10


def posting_age_days(posted: date | None, today: date) -> int | None:
    if posted is None:
        return None
    return max((today - posted).days, 0)


def age_penalty(posted: date | None, today: date) -> int:
    age = posting_age_days(posted, today)
    if age is None:
        age = UNDATED_ASSUMED_AGE_DAYS
    return max(age - FRESH_DAYS, 0) * PENALTY_PER_DAY


def drop_stale(jobs: list[JobResult], today: date) -> list[JobResult]:
    """Remove postings older than MAX_POSTING_AGE_DAYS. Undated postings are kept."""
    kept: list[JobResult] = []
    for job in jobs:
        age = posting_age_days(job.posted_date, today)
        if age is not None and age > MAX_POSTING_AGE_DAYS:
            logger.info("Dropped stale job (%d days old): %s", age, job.job_url)
            continue
        kept.append(job)
    return kept
