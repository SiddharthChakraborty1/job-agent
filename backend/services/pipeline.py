import logging
from collections.abc import Awaitable, Callable
from datetime import date

from job_agents.dorking_agent import generate_queries
from job_agents.validation_agent import validate
from models.schemas import JobResult, PipelineResponse
from services.batched_search import run_batched_search
from services.company_tier import classify_company_tiers
from services.deduplicator import deduplicate

logger = logging.getLogger(__name__)


async def run_pipeline(
    resume_text: str,
    progress_cb: Callable[[str], Awaitable[None]],
) -> PipelineResponse:
    """Orchestrate the full job-finding pipeline.

    Raises:
        ValueError: on fatal errors (< 5 dorking queries).
    """
    warnings: list[str] = []

    # Step 1: Generate dorking queries
    await progress_cb("Generating dorking queries...")
    queries = await generate_queries(resume_text)

    # Step 2: Run all dorks in parallel, fetch pages, extract listings
    await progress_cb("Searching job boards in parallel...")
    try:
        all_jobs: list[JobResult] = await run_batched_search(queries)
    except Exception as exc:
        logger.error("Batched search failed: %s", exc)
        raise ValueError(f"Job search failed: {type(exc).__name__}: {exc}") from exc

    if not all_jobs:
        warnings.append("No job listings were found from the search results.")

    # Step 3: Deduplicate
    await progress_cb("Deduplicating results...")
    all_jobs = deduplicate(all_jobs)

    # Step 4: Label companies by what they are, not a search guess
    await progress_cb("Classifying company tiers...")
    all_jobs = await classify_company_tiers(all_jobs)

    # Step 5: Validate (skip if empty)
    if not all_jobs:
        return PipelineResponse(validated=[], unscored=[], warnings=warnings)

    await progress_cb("Validating and scoring results...")
    validated, unscored, val_warnings = await validate(resume_text, all_jobs)
    warnings.extend(val_warnings)

    # Step 6: Sort validated by (posted_date desc, alignment_score desc)
    validated.sort(
        key=lambda r: (r.posted_date or date.min, r.alignment_score),
        reverse=True,
    )

    return PipelineResponse(validated=validated, unscored=unscored, warnings=warnings)
