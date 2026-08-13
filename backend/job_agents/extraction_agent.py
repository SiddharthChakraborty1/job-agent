"""Single cheap-model pass to turn search hits into structured job listings."""

from __future__ import annotations

import json
import logging
from typing import Any

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list
from models.schemas import JobResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You extract structured job listings from Google search hits for the Indian job market.

Each input item has: url, title, snippet, and optionally page_text (fetched page content).

Rules:
- Only include real job postings — not company homepages, blogs, category pages, or login walls
- Skip listings clearly outside India with no India office or remote-India option
- job_url must copy the input url exactly
- company_name: extract from title, snippet, or page_text; avoid using the job board name as the company
- organisation_tier: best guess — startup | midlevel | enterprise
- description: max 300 characters summarising the role
- posted_date: YYYY-MM-DD if clearly stated, else null

Return ONLY a JSON array of at most 50 objects with fields:
job_title, company_name, job_url, organisation_tier, description, posted_date

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
        if hit.page_text:
            item["page_text"] = hit.page_text[:2000]
        payload.append(item)
    return payload


async def extract_jobs(hits: list[Any]) -> list[JobResult]:
    """Parse search hits into JobResult objects via one LLM call."""
    if not hits:
        return []

    prompt = (
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
            jobs.append(JobResult.model_validate(item))
        except Exception as exc:
            logger.warning("Skipping invalid extracted job: %s", exc)
    return jobs
