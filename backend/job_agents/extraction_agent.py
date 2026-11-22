"""Single cheap-model pass to turn search hits into structured job listings."""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from typing import Any

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list
from models.schemas import JobResult

logger = logging.getLogger(__name__)

# Only null out implausible dates (copyright footers like 2023). Real but old
# dates are kept so services/freshness.drop_stale can remove those jobs; nulling
# them made old jobs look undated and let them through.
MAX_POSTED_AGE_DAYS = 365

SYSTEM_PROMPT = """You extract structured job listings from Google search hits for the Indian job market.

Each input item has: url, title, snippet, optional date (from Google/Serper), and optionally page_text.

Rules:
- Only include real job postings — not company homepages, blogs, category pages, or login walls
- Do not skip listings because of location; report location faithfully (filtering happens in code)
- location: city or cities as listed (join multiple with " | ", add "Remote" if remote); null if unknown
- country: "India" if ANY listed location is in India or the role is remote and open to India;
  otherwise the country name as stated (e.g. "United States"); null if unknown. Never guess
- remote: true if fully remote, false if onsite/hybrid stated, null if unknown
- If page_text starts with "STRUCTURED JOB DATA", treat those fields (title, company, locations, date posted) as authoritative over the snippet
- job_url must copy the input url exactly
- company_name: extract from title, snippet, or page_text; avoid using the job board name as the company
- organisation_tier: best guess — startup | midlevel | enterprise
- description: max 300 characters summarising the role
- posted_date: YYYY-MM-DD when you can resolve it; otherwise null
  - Prefer the hit's `date` field from Google/Serper (e.g. "2 days ago", "1 week ago", "13 Aug")
  - Interpret relative dates using TODAY supplied in the request
  - Never invent a year. Do not use copyright years (© 2023) or random old years from page footers
  - Report the real posted date even if it is weeks old (stale jobs are filtered in code); use null only when unsure

Return ONLY a JSON array of at most 50 objects with fields:
job_title, company_name, job_url, organisation_tier, description, posted_date, location, country, remote

No markdown, no explanation."""

_agent = Agent(
    name="ExtractionAgent",
    model=settings.cheap_model,
    instructions=SYSTEM_PROMPT,
)


def _compact_hits(hits: list[Any]) -> list[dict[str, str]]:
    payload: list[dict[str, str]] = []
    for hit in hits:
        item: dict[str, str] = {
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


async def extract_jobs(hits: list[Any]) -> list[JobResult]:
    """Parse search hits into JobResult objects via one LLM call."""
    if not hits:
        return []

    today = date.today()
    prompt = (
        f"TODAY is {today.isoformat()}. "
        "Resolve relative Google dates (like '2 days ago') relative to TODAY. "
        "Do not invent years.\n\n"
        "Extract job listings from these search hits:\n"
        + json.dumps(_compact_hits(hits), indent=2)
    )

    try:
        result = await Runner.run(_agent, prompt)
        items: list[Any] = parse_json_list(result.final_output)
    except Exception as exc:
        logger.error("ExtractionAgent failed: %s", exc)
        return []

    jobs: list[JobResult] = []
    for item in items[:50]:
        try:
            job = JobResult.model_validate(item)
            cleaned = _sanitise_posted_date(job.posted_date, today)
            if cleaned != job.posted_date:
                logger.info(
                    "Dropped stale/future posted_date %s for %s",
                    job.posted_date,
                    job.job_url,
                )
                job = job.model_copy(update={"posted_date": cleaned})
            jobs.append(job)
        except Exception as exc:
            logger.warning("Skipping invalid extracted job: %s", exc)
    return jobs
