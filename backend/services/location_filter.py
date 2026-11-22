"""Keep India / unknown-location jobs; drop jobs whose extracted country is elsewhere.

Location is a property of each posting, so it is checked here in code rather than
by banning whole job boards in the search prompt.
"""

from __future__ import annotations

import logging

from models.schemas import JobResult

logger = logging.getLogger(__name__)

_INDIA_NAMES = frozenset({"india", "in", "ind", "bharat"})


def is_india(country: str | None) -> bool:
    return bool(country) and country.strip().lower() in _INDIA_NAMES


def filter_by_location(jobs: list[JobResult]) -> list[JobResult]:
    """Drop jobs with a known non-India country. Unknown country is kept.

    A remote role tied to another country (e.g. remote-US) is dropped too:
    it is usually not open to candidates in India.
    """
    kept: list[JobResult] = []
    for job in jobs:
        if job.country and not is_india(job.country):
            logger.info("Dropped non-India job %s (%s)", job.job_url, job.country)
            continue
        kept.append(job)
    return kept
