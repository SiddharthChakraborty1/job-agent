import json
import logging
from typing import Any

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list
from models.schemas import JobResult, UnscoredJobResult, ValidatedJobResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a senior technical recruiter focused on the Indian job market. You will be given a candidate's resume and a list of job postings.

For each job posting, evaluate how well the candidate's skills, experience, and background align with the job requirements. Assign an integer alignment score from 0 to 100 where:
- 0-20: Poor fit (major skill gaps)
- 21-40: Below average fit
- 41-60: Moderate fit
- 61-80: Good fit
- 81-100: Excellent fit (strong match)

Include a justification of no more than 100 words explaining the score.

Location bias (unless the resume explicitly seeks relocation abroad):
- Score 0–15 for jobs clearly located outside India with no India office or remote-India option.
- Prefer jobs in Indian cities or remote/hybrid roles open to candidates in India.

Return ONLY a JSON array. Each element must have these exact fields:
- job_url: the job URL (copy exactly from input)
- alignment_score: integer 0-100
- justification: string, max 100 words

No markdown, no explanation outside the JSON array.
"""

_agent = Agent(
    name="ValidationAgent",
    model=settings.costly_model,
    instructions=SYSTEM_PROMPT,
)


async def validate(
    resume_text: str,
    jobs: list[JobResult],
    preferred_cities: list[str] | None = None,
) -> tuple[list[ValidatedJobResult], list[UnscoredJobResult], list[str]]:
    """Score each job result against the resume.

    Returns:
        (validated, unscored, warnings)
    """
    if not jobs:
        return [], [], []

    # Build the URL→job mapping for later lookup
    job_by_url: dict[str, JobResult] = {j.job_url: j for j in jobs}

    jobs_json = json.dumps([j.model_dump(mode="json") for j in jobs], indent=2)
    cities_text = ", ".join(preferred_cities) if preferred_cities else ""
    location_line = (
        f"\nPreferred locations: {cities_text}. Prefer these cities or remote-India; "
        "downscore other Indian cities only slightly; still score 0–15 for roles outside India.\n"
        if cities_text
        else ""
    )
    prompt = f"RESUME:\n{resume_text}{location_line}\nJOBS:\n{jobs_json}"

    try:
        result = await Runner.run(_agent, input=prompt)
        scored_items: list[Any] = parse_json_list(result.final_output)
    except Exception as exc:
        logger.error("ValidationAgent failed entirely: %s", exc)
        warning = f"Validation was unavailable: {type(exc).__name__}"
        unscored = [UnscoredJobResult(**j.model_dump()) for j in jobs]
        return [], unscored, [warning]

    # Map scored items back to jobs
    validated: list[ValidatedJobResult] = []
    scored_urls: set[str] = set()
    warnings: list[str] = []

    for item in scored_items:
        url = item.get("job_url", "")
        job = job_by_url.get(url)
        if job is None:
            logger.warning("ValidationAgent returned unknown job_url: %s", url)
            continue
        try:
            validated.append(
                ValidatedJobResult(
                    **job.model_dump(),
                    alignment_score=item["alignment_score"],
                    justification=item["justification"],
                )
            )
            scored_urls.add(url)
        except Exception as exc:
            logger.warning("Skipping invalid ValidatedJobResult for %s: %s", url, exc)

    # Any job not scored → unscored
    unscored = [
        UnscoredJobResult(**j.model_dump())
        for j in jobs
        if j.job_url not in scored_urls
    ]

    if unscored:
        warnings.append(
            f"Validation was partial: {len(unscored)} job(s) could not be scored and are shown without scores."
        )

    return validated, unscored, warnings
