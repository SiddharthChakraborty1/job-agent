import asyncio
import logging
from collections.abc import Awaitable, Callable
from datetime import date

from job_agents.dorking_agent import generate_queries
from job_agents.search_agents import enterprise_agent, midlevel_agent, startup_agent
from job_agents.validation_agent import validate
from models.schemas import JobResult, PipelineResponse
from services.company_tier import classify_company_tiers
from services.deduplicator import deduplicate

logger = logging.getLogger(__name__)

TIERS = ["startup", "midlevel", "enterprise"]


async def run_pipeline(
    resume_text: str,
    progress_cb: Callable[[str], Awaitable[None]],
) -> PipelineResponse:
    """Orchestrate the full job-finding pipeline.

    Raises:
        ValueError: on fatal errors (< 5 dorking queries, all search agents failed).
    """
    # Step 1: Generate dorking queries
    await progress_cb("Generating dorking queries...")
    queries = await generate_queries(resume_text)
    # generate_queries already raises ValueError if < 5 queries

    # Step 2: Run all three search agents concurrently
    await progress_cb("Searching startups, mid-level orgs, and enterprises in parallel...")
    results = await asyncio.gather(
        startup_agent.search(queries),
        midlevel_agent.search(queries),
        enterprise_agent.search(queries),
        return_exceptions=True,
    )

    # Step 3: Collect results, record per-tier warnings
    all_jobs: list[JobResult] = []
    warnings: list[str] = []
    failed_count = 0

    for tier, result in zip(TIERS, results):
        if isinstance(result, Exception):
            logger.error("%s search agent failed: %s", tier, result)
            warnings.append(f"{tier.capitalize()} search failed: {type(result).__name__}: {result}")
            failed_count += 1
        else:
            all_jobs.extend(result)

    if failed_count == 3:
        raise ValueError("All three search agents failed; no job results available.")

    # Step 4: Deduplicate
    await progress_cb("Deduplicating results...")
    all_jobs = deduplicate(all_jobs)

    # Step 5: Label companies by what they are, not which agent found them
    await progress_cb("Classifying company tiers...")
    all_jobs = await classify_company_tiers(all_jobs)

    # Step 6: Validate (skip if empty)
    if not all_jobs:
        return PipelineResponse(validated=[], unscored=[], warnings=warnings)

    await progress_cb("Validating and scoring results...")
    validated, unscored, val_warnings = await validate(resume_text, all_jobs)
    warnings.extend(val_warnings)

    # Step 7: Sort validated by (posted_date desc, alignment_score desc)
    validated.sort(
        key=lambda r: (r.posted_date or date.min, r.alignment_score),
        reverse=True,
    )

    return PipelineResponse(validated=validated, unscored=unscored, warnings=warnings)
