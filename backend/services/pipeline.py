import logging
from collections.abc import Awaitable, Callable
from datetime import date

from job_agents.dorking_agent import generate_queries
from job_agents.validation_agent import validate
from models.schemas import JobResult, PipelineResponse, UnscoredJobResult, ValidatedJobResult
from services.batched_search import run_batched_search
from services.company_tier import classify_company_tiers
from services.deduplicator import deduplicate
from services.freshness import age_penalty, drop_stale
from services.location_filter import filter_by_location
from services.skill_gaps import aggregate_skill_gaps

logger = logging.getLogger(__name__)


def sort_validated_jobs(
    jobs: list[ValidatedJobResult], today: date | None = None
) -> list[ValidatedJobResult]:
    """Rank by fit minus an age penalty; newer first on ties, undated last.

    alignment_score itself is not modified: it stays a pure fit measure. A strong
    fit posted 10 days ago now ranks below a good fit posted today.
    """
    today = today or date.today()
    return sorted(
        jobs,
        key=lambda r: (
            r.alignment_score - age_penalty(r.posted_date, today),
            r.posted_date is not None,
            r.posted_date or date.min,
        ),
        reverse=True,
    )


def sort_unscored_jobs(jobs: list[UnscoredJobResult]) -> list[UnscoredJobResult]:
    """Most recent first. Undated jobs last."""
    return sorted(
        jobs,
        key=lambda r: (r.posted_date is not None, r.posted_date or date.min),
        reverse=True,
    )


async def run_pipeline(
    resume_text: str,
    progress_cb: Callable[[str], Awaitable[None]],
    preferred_cities: list[str] | None = None,
) -> PipelineResponse:
    """Orchestrate the full job-finding pipeline.

    Raises:
        ValueError: on fatal errors (< 5 dorking queries).
    """
    warnings: list[str] = []

    # Step 1: Generate dorking queries
    await progress_cb("Generating dorking queries...")
    queries = await generate_queries(resume_text, preferred_cities)

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

    # Step 3b: Drop jobs whose extracted country is outside India (unknown is kept)
    before = len(all_jobs)
    all_jobs = filter_by_location(all_jobs)
    if before and not all_jobs:
        warnings.append("All found jobs were located outside India.")

    # Step 3c: Drop postings older than the freshness limit (undated are kept)
    before = len(all_jobs)
    all_jobs = drop_stale(all_jobs, date.today())
    if before and not all_jobs:
        warnings.append("All found jobs were older than the freshness limit.")

    # Step 4: Label companies by what they are, not a search guess
    await progress_cb("Classifying company tiers...")
    all_jobs = await classify_company_tiers(all_jobs)

    # Step 5: Validate (skip if empty)
    if not all_jobs:
        return PipelineResponse(validated=[], unscored=[], warnings=warnings)

    await progress_cb("Validating and scoring results...")
    validated, unscored, val_warnings = await validate(
        resume_text, all_jobs, preferred_cities
    )
    warnings.extend(val_warnings)

    validated = sort_validated_jobs(validated)
    unscored = sort_unscored_jobs(unscored)

    await progress_cb("Summarizing skill gaps...")
    skill_gaps = aggregate_skill_gaps(validated)

    return PipelineResponse(
        validated=validated,
        unscored=unscored,
        warnings=warnings,
        skill_gaps=skill_gaps,
    )
