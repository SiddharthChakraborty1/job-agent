from urllib.parse import urlparse, urlunparse

import re

from models.schemas import JobResult
from services.company_tier import normalise_company_name


def normalise_url(url: str) -> str:
    """Normalise a URL for deduplication purposes.

    Rules:
    - Lowercase scheme and host
    - Strip all query parameters (and fragment)
    - Remove trailing slash from path
    """
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    # Reconstruct without query or fragment
    return urlunparse((scheme, netloc, path, "", "", ""))


def _role_key(result: JobResult) -> tuple[str, str, str] | None:
    """Same company + title + city = same role, even across job boards."""
    company = normalise_company_name(result.company_name)
    title = re.sub(r"[^a-z0-9]+", " ", result.job_title.lower()).strip()
    city = re.sub(r"[^a-z0-9|]+", " ", (result.location or "").lower()).strip()
    if not company or not title:
        return None
    return company, title, city


def deduplicate(results: list[JobResult]) -> list[JobResult]:
    """Remove duplicate job results.

    Two results are duplicates when their normalised URLs match, or when they share
    company + title + location (the same role cross-posted on several boards).
    First-encountered entry wins.
    """
    seen_urls: set[str] = set()
    seen_roles: set[tuple[str, str, str]] = set()
    deduplicated: list[JobResult] = []

    for result in results:
        norm = normalise_url(result.job_url)
        role = _role_key(result)
        if norm in seen_urls or (role is not None and role in seen_roles):
            continue
        seen_urls.add(norm)
        if role is not None:
            seen_roles.add(role)
        deduplicated.append(result)

    return deduplicated
