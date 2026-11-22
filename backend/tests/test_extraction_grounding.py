"""Extracted jobs must stay tied to the search hit they came from."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from job_agents.extraction_agent import EXTRACT_BATCH_SIZE, extract_jobs
from services.batched_search import SearchHit

WELLFOUND = SearchHit(
    url="https://wellfound.com/jobs/3123456-automation-data-engineering-fellow",
    title="Automation & Data Engineering Fellow at FairwAI",
    snippet="FairwAI · Remote · Intern · Hires remotely in India",
    date="1 week ago",
)
NAUKRI = SearchHit(
    url="https://www.naukri.com/job-listings-senior-python-developer-crisil-pune-123",
    title="Senior Python Developer - Crisil - Pune",
    snippet="Crisil is hiring a Senior Python Developer in Pune",
    date="2 days ago",
)


def _item(**kw):
    base = {
        "job_title": "Senior Python Developer",
        "company_name": "Crisil",
        "organisation_tier": "enterprise",
        "description": "Python role in Pune.",
        "posted_date": None,
    }
    base.update(kw)
    return base


class _Result:
    def __init__(self, items):
        self.final_output = json.dumps(items)


@pytest.mark.asyncio
async def test_job_url_comes_from_the_hit_id_not_the_model():
    """The model returns hit_id 1 but a wrong URL: the job must link to hit 1."""
    items = [_item(hit_id=1, job_url=WELLFOUND.url)]
    with patch("job_agents.extraction_agent.Runner.run", new=AsyncMock(return_value=_Result(items))):
        jobs = await extract_jobs([WELLFOUND, NAUKRI])

    assert len(jobs) == 1
    assert jobs[0].job_url == NAUKRI.url


@pytest.mark.asyncio
async def test_job_whose_company_is_not_in_its_hit_is_dropped():
    """Crisil details attached to the FairwAI hit: the mismatch reported on the live site."""
    items = [_item(hit_id=0)]
    with patch("job_agents.extraction_agent.Runner.run", new=AsyncMock(return_value=_Result(items))):
        jobs = await extract_jobs([WELLFOUND, NAUKRI])

    assert jobs == []


@pytest.mark.asyncio
async def test_unknown_hit_id_is_dropped():
    items = [_item(hit_id=7)]
    with patch("job_agents.extraction_agent.Runner.run", new=AsyncMock(return_value=_Result(items))):
        assert await extract_jobs([WELLFOUND, NAUKRI]) == []


@pytest.mark.asyncio
async def test_company_found_in_url_host_counts_as_grounded():
    keka = SearchHit(
        url="https://hr.keka.com/careers/jobdetails/90215",
        title="Principal Software Engineer",
        snippet="Engineering · Hyderabad, India",
    )
    items = [_item(hit_id=0, job_title="Principal Software Engineer", company_name="Keka")]
    with patch("job_agents.extraction_agent.Runner.run", new=AsyncMock(return_value=_Result(items))):
        jobs = await extract_jobs([keka])

    assert [j.job_url for j in jobs] == [keka.url]


@pytest.mark.asyncio
async def test_legal_suffixes_do_not_break_grounding():
    items = [_item(hit_id=0, company_name="CRISIL Limited")]
    with patch("job_agents.extraction_agent.Runner.run", new=AsyncMock(return_value=_Result(items))):
        jobs = await extract_jobs([NAUKRI])

    assert len(jobs) == 1


@pytest.mark.asyncio
async def test_hits_are_extracted_in_small_batches():
    hits = [
        SearchHit(url=f"https://www.naukri.com/job-listings-{i}", title=f"Engineer - Acme{i}", snippet="Pune")
        for i in range(EXTRACT_BATCH_SIZE * 2 + 1)
    ]
    calls: list[str] = []

    async def fake_run(agent, prompt):
        calls.append(prompt)
        return _Result([])

    with patch("job_agents.extraction_agent.Runner.run", side_effect=fake_run):
        await extract_jobs(hits)

    assert len(calls) == 3
    # Each batch numbers its hits from 0, so ids stay small and local to the batch.
    assert all('"hit_id": 0' in prompt for prompt in calls)
