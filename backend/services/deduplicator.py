from urllib.parse import urlparse, urlunparse

from models.schemas import JobResult


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


def deduplicate(results: list[JobResult]) -> list[JobResult]:
    """Remove duplicate job results by normalised URL.

    First-encountered entry wins on URL collision.
    Entries with the same company+title but different URLs are both retained.
    """
    seen_urls: set[str] = set()
    deduplicated: list[JobResult] = []

    for result in results:
        norm = normalise_url(result.job_url)
        if norm in seen_urls:
            continue
        seen_urls.add(norm)
        deduplicated.append(result)

    return deduplicated
