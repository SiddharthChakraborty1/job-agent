"""Run all dorks in parallel, fetch job pages concurrently, extract via one LLM call."""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from urllib.parse import urlparse

from job_agents.extraction_agent import extract_jobs
from models.schemas import JobResult
from services.page_fetch import fetch_page_text, is_blocked_url
from services.serper import search_dork

logger = logging.getLogger(__name__)

MAX_DORKS = 15  # matches the DorkingAgent's upper bound
MAX_URLS_TO_FETCH = 40
SERPER_CONCURRENCY = 6
FETCH_CONCURRENCY = 8

_INDIAN_JOB_HOST_SUFFIXES = (
    "naukri.com",
    "linkedin.com",
    "instahyre.com",
    "hirist.com",
    "indeed.co.in",
    "cutshort.io",
    "shine.com",
    "iimjobs.com",
    "foundit.in",
    "timesjobs.com",
)

_JOB_PATH_HINTS = ("/job", "/jobs", "/career", "/careers", "/viewjob", "/listing")

# Career platforms and startup boards: (host suffix, regex for a single posting's
# path). The job signal is in the host, so a plain path-hint check misses these
# (e.g. Lever's /<company>/<uuid>). Board/listing pages deliberately don't match.
# Location is decided per posting later, never by the host.
_UUIDISH = r"[0-9a-f]{8}-[0-9a-f-]{20,}"
_JOB_SITE_POSTING_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = tuple(
    (host, re.compile(pattern))
    for host, pattern in (
        ("lever.co", rf"^/[^/]+/{_UUIDISH}"),
        ("greenhouse.io", r"^/[^/]+/jobs/\d+"),
        ("jobs.ashbyhq.com", rf"^/[^/]+/{_UUIDISH}"),
        ("keka.com", r"^/careers/jobdetails/\d+"),
        ("zohorecruit.com", r"^/jobs/careers/\d+"),
        ("zohorecruit.in", r"^/jobs/careers/\d+"),
        ("myworkdayjobs.com", r"/job/"),
        ("myworkdaysite.com", r"/job/"),
        ("jobs.smartrecruiters.com", r"^/[^/]+/\d+"),
        ("apply.workable.com", r"^/[^/]+/j/[0-9a-z]+"),
        ("wellfound.com", r"^/jobs/\d+"),
        ("workatastartup.com", r"^/jobs/\d+"),
        ("ycombinator.com", r"^/companies/[^/]+/jobs/[^/]+"),
    )
)


@dataclass(frozen=True)
class SearchHit:
    url: str
    title: str
    snippet: str
    date: str | None = None  # Serper/Google date string, e.g. "2 days ago"
    page_text: str | None = None


def _normalise_host(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


def _is_indian_job_host(url: str) -> bool:
    host = _normalise_host(url)
    return any(host == suffix or host.endswith("." + suffix) for suffix in _INDIAN_JOB_HOST_SUFFIXES)


def _is_job_site_posting(url: str) -> bool:
    """True for a single posting on a known career platform or startup board."""
    host = _normalise_host(url)
    path = urlparse(url).path.lower()
    return any(
        (host == suffix or host.endswith("." + suffix)) and pattern.search(path)
        for suffix, pattern in _JOB_SITE_POSTING_PATTERNS
    )


def _url_priority(url: str) -> int:
    """Higher score = more likely a direct job listing worth fetching."""
    parsed = urlparse(url)
    path = parsed.path.lower()
    score = 0
    posting = _is_job_site_posting(url)
    if _is_indian_job_host(url) or posting:
        score += 5
    if posting or any(hint in path for hint in _JOB_PATH_HINTS):
        score += 8
    if path in ("", "/"):
        score -= 10
    if is_blocked_url(url):
        score -= 100
    return score


def _dedupe_queries(queries: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for query in queries:
        key = query.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(query.strip())
    return unique[:MAX_DORKS]


def _merge_serper_hits(rows: list[list[dict[str, str]]]) -> list[SearchHit]:
    by_url: dict[str, SearchHit] = {}
    for batch in rows:
        for row in batch:
            url = row["url"]
            if url in by_url:
                continue
            by_url[url] = SearchHit(
                url=url,
                title=row["title"],
                snippet=row["snippet"],
                date=(row.get("date") or "").strip() or None,
            )
    hits = list(by_url.values())
    hits.sort(key=lambda h: _url_priority(h.url), reverse=True)
    return hits


async def _search_all_dorks(queries: list[str]) -> list[list[dict[str, str]]]:
    sem = asyncio.Semaphore(SERPER_CONCURRENCY)

    async def one(query: str) -> list[dict[str, str]]:
        async with sem:
            return await search_dork(query)

    return list(await asyncio.gather(*[one(q) for q in queries]))


async def _fetch_pages(urls: list[str]) -> dict[str, str]:
    sem = asyncio.Semaphore(FETCH_CONCURRENCY)

    async def one(url: str) -> tuple[str, str]:
        async with sem:
            text = await fetch_page_text(url)
            return url, text

    pairs = await asyncio.gather(*[one(url) for url in urls])
    return dict(pairs)


def _attach_page_text(hits: list[SearchHit], page_texts: dict[str, str]) -> list[SearchHit]:
    enriched: list[SearchHit] = []
    for hit in hits:
        text = page_texts.get(hit.url)
        if text and not text.startswith("<error>"):
            enriched.append(
                SearchHit(
                    url=hit.url,
                    title=hit.title,
                    snippet=hit.snippet,
                    date=hit.date,
                    page_text=text,
                )
            )
        else:
            enriched.append(hit)
    return enriched


async def run_batched_search(queries: list[str]) -> list[JobResult]:
    """Execute dorks once each, fetch top URLs in parallel, extract job listings."""
    dorks = _dedupe_queries(queries)
    if not dorks:
        return []

    logger.info("Batched search: %d dork(s)", len(dorks))
    serper_batches = await _search_all_dorks(dorks)
    hits = _merge_serper_hits(serper_batches)
    if not hits:
        logger.info("Batched search: no Serper hits")
        return []

    fetch_urls = [
        hit.url
        for hit in hits[:MAX_URLS_TO_FETCH]
        if _url_priority(hit.url) > 0 and not is_blocked_url(hit.url)
    ]
    page_texts = await _fetch_pages(fetch_urls) if fetch_urls else {}
    hits = _attach_page_text(hits, page_texts)

    jobs = await extract_jobs(hits)
    logger.info("Batched search: extracted %d job(s) from %d hit(s)", len(jobs), len(hits))
    return jobs
