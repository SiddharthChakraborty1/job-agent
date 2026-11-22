"""Cheap-model passes (small batches) that turn search hits into structured job listings."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import date, timedelta
from typing import Any

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list
from models.schemas import JobResult
from services.company_tier import normalise_company_name

logger = logging.getLogger(__name__)

# Small batches keep each hit's title/company/URL together; one call over 100+
# hits let the model attach one hit's details to another hit's URL.
EXTRACT_BATCH_SIZE = 8
EXTRACT_CONCURRENCY = 4

# Only null out implausible dates (copyright footers like 2023). Real but old
# dates are kept so services/freshness.drop_stale can remove those jobs; nulling
# them made old jobs look undated and let them through.
MAX_POSTED_AGE_DAYS = 365

SYSTEM_PROMPT = """You extract structured job listings from Google search hits for the Indian job market.

Each input item has: hit_id, url, title, snippet, optional date (from Google/Serper), and optionally page_text.

Rules:
- Only include real job postings — not company homepages, blogs, category pages, or login walls
- Do not skip listings because of location; report location faithfully (filtering happens in code)
- location: city or cities as listed (join multiple with " | ", add "Remote" if remote); null if unknown
- country: "India" if ANY listed location is in India or the role is remote and open to India;
  otherwise the country name as stated (e.g. "United States"); null if unknown. Never guess
- remote: true if fully remote, false if onsite/hybrid stated, null if unknown
- If page_text starts with "STRUCTURED JOB DATA", treat those fields (title, company, locations, date posted) as authoritative over the snippet
- hit_id: the hit_id of the ONE input item this listing comes from. Every field must come from that same item; never combine details from different items
- company_name: extract from title, snippet, or page_text; avoid using the job board name as the company
- organisation_tier: best guess — startup | midlevel | enterprise
- description: max 300 characters summarising the role
- posted_date: YYYY-MM-DD when you can resolve it; otherwise null
  - Prefer the hit's `date` field from Google/Serper (e.g. "2 days ago", "1 week ago", "13 Aug")
  - Interpret relative dates using TODAY supplied in the request
  - Never invent a year. Do not use copyright years (© 2023) or random old years from page footers
  - Report the real posted date even if it is weeks old (stale jobs are filtered in code); use null only when unsure

Return ONLY a JSON array (at most one object per input item) with fields:
hit_id, job_title, company_name, organisation_tier, description, posted_date, location, country, remote

No markdown, no explanation."""

_agent = Agent(
    name="ExtractionAgent",
    model=settings.cheap_model,
    instructions=SYSTEM_PROMPT,
)


def _compact_hits(hits: list[Any]) -> list[dict[str, Any]]:
    payload: list[dict[str, Any]] = []
    for hit_id, hit in enumerate(hits):
        item: dict[str, Any] = {
            "hit_id": hit_id,
            "url": hit.url,
            "title": hit.title,
            "snippet": hit.snippet,
        }
        if hit.date:
            item["date"] = hit.date
        if hit.page_text:
            item["page_text"] = hit.page_text[:2000]
        payload.append(item)
    return payload


def _sanitise_posted_date(posted: date | None, today: date) -> date | None:
    """Null out dates in the future or implausibly old (likely copyright years)."""
    if posted is None:
        return None
    if posted > today:
        return None
    if posted < today - timedelta(days=MAX_POSTED_AGE_DAYS):
        return None
    return posted


def _tokens(text: str) -> set[str]:
    return set(re.sub(r"[^a-z0-9]+", " ", text.lower()).split())


def _is_grounded(company_name: str, hit: Any) -> bool:
    """True if the company appears in the hit's own URL, title, snippet or page text."""
    company = _tokens(normalise_company_name(company_name))
    if not company:
        return False
    haystack = _tokens(
        " ".join([hit.url, hit.title, hit.snippet, getattr(hit, "page_text", None) or ""])
    )
    return company <= haystack


def _batch_prompt(batch: list[Any], today: date) -> str:
    return (
        f"TODAY is {today.isoformat()}. "
        "Resolve relative Google dates (like '2 days ago') relative to TODAY. "
        "Do not invent years.\n\n"
        "Extract job listings from these search hits:\n"
        + json.dumps(_compact_hits(batch), indent=2)
    )


def _to_job(item: Any, batch: list[Any], today: date) -> JobResult | None:
    """Bind an extracted item to its source hit; None if it can't be trusted."""
    if not isinstance(item, dict):
        return None
    hit_id = item.get("hit_id")
    if isinstance(hit_id, bool) or not isinstance(hit_id, int) or not 0 <= hit_id < len(batch):
        logger.warning("Extraction returned unknown hit_id %r; skipping", hit_id)
        return None
    hit = batch[hit_id]
    data = {k: v for k, v in item.items() if k != "hit_id"}
    data["job_url"] = hit.url  # never trust a URL written by the model
    try:
        job = JobResult.model_validate(data)
    except Exception as exc:
        logger.warning("Skipping invalid extracted job: %s", exc)
        return None
    if not _is_grounded(job.company_name, hit):
        logger.warning(
            "Dropped ungrounded job: company %r not found in hit %s", job.company_name, hit.url
        )
        return None
    cleaned = _sanitise_posted_date(job.posted_date, today)
    if cleaned != job.posted_date:
        logger.info("Dropped implausible posted_date %s for %s", job.posted_date, job.job_url)
        job = job.model_copy(update={"posted_date": cleaned})
    return job


async def _extract_batch(batch: list[Any], today: date) -> list[JobResult]:
    try:
        result = await Runner.run(_agent, _batch_prompt(batch, today))
        items: list[Any] = parse_json_list(result.final_output)
    except Exception as exc:
        logger.error("ExtractionAgent batch failed: %s", exc)
        return []
    jobs: list[JobResult] = []
    seen_hits: set[int] = set()
    for item in items[: len(batch)]:
        job = _to_job(item, batch, today)
        if job is None:
            continue
        hit_id = item["hit_id"]
        if hit_id in seen_hits:  # one listing per hit
            continue
        seen_hits.add(hit_id)
        jobs.append(job)
    return jobs


async def extract_jobs(hits: list[Any]) -> list[JobResult]:
    """Parse search hits into JobResult objects, EXTRACT_BATCH_SIZE hits per LLM call."""
    if not hits:
        return []

    today = date.today()
    batches = [hits[i : i + EXTRACT_BATCH_SIZE] for i in range(0, len(hits), EXTRACT_BATCH_SIZE)]
    sem = asyncio.Semaphore(EXTRACT_CONCURRENCY)

    async def one(batch: list[Any]) -> list[JobResult]:
        async with sem:
            return await _extract_batch(batch, today)

    results = await asyncio.gather(*[one(batch) for batch in batches])
    return [job for batch_jobs in results for job in batch_jobs]
