"""Tests for deterministic batched search."""

from unittest.mock import AsyncMock, patch

import pytest

from job_agents.extraction_agent import extract_jobs
from models.schemas import JobResult
from services.batched_search import (
    SearchHit,
    _dedupe_queries,
    _merge_serper_hits,
    _url_priority,
    run_batched_search,
)


def test_dedupe_queries_caps_and_dedupes():
    queries = [
        "site:naukri.com Python",
        "site:naukri.com Python",
        "  site:hirist.com Django  ",
        *[f"q{i}" for i in range(12)],
    ]
    result = _dedupe_queries(queries)
    assert result[0] == "site:naukri.com Python"
    assert result[1] == "site:hirist.com Django"
    assert len(result) == 10


def test_merge_serper_hits_dedupes_by_url_and_sorts_job_urls_first():
    batches = [
        [
            {"url": "https://naukri.com/", "title": "Home", "snippet": "portal"},
            {
                "url": "https://www.naukri.com/job-listings-backend-engineer-acme",
                "title": "Backend Engineer - Acme",
                "snippet": "Python Bangalore",
                "date": "2 days ago",
            },
        ],
        [
            {
                "url": "https://www.naukri.com/job-listings-backend-engineer-acme",
                "title": "Duplicate",
                "snippet": "ignored",
            },
            {
                "url": "https://www.hirist.com/j/123",
                "title": "Backend Dev",
                "snippet": "Django",
            },
        ],
    ]
    hits = _merge_serper_hits(batches)
    assert len(hits) == 3
    assert hits[0].url.endswith("job-listings-backend-engineer-acme")
    assert hits[0].date == "2 days ago"
    assert hits[1].url.endswith("/j/123")


def test_url_priority_prefers_job_paths_on_indian_hosts():
    assert _url_priority("https://www.naukri.com/job-listings-foo") > _url_priority(
        "https://www.naukri.com/"
    )


@pytest.mark.asyncio
async def test_run_batched_search_runs_each_dork_once():
    dorks = ["site:naukri.com Python", "site:hirist.com Django"]
    serper_calls: list[str] = []

    async def fake_search_dork(query: str):
        serper_calls.append(query)
        return [
            {
                "url": f"https://example.com/jobs/{len(serper_calls)}",
                "title": "Engineer",
                "snippet": "Python India",
            }
        ]

    stub_jobs = [
        JobResult(
            job_title="Engineer",
            company_name="Acme",
            job_url="https://example.com/jobs/1",
            organisation_tier="startup",
            description="Python role",
        )
    ]

    with (
        patch("services.batched_search.search_dork", side_effect=fake_search_dork),
        patch("services.batched_search.fetch_page_text", new=AsyncMock(return_value="Job details")),
        patch("services.batched_search.extract_jobs", new=AsyncMock(return_value=stub_jobs)),
    ):
        jobs = await run_batched_search(dorks)

    assert serper_calls == dorks
    assert jobs == stub_jobs


@pytest.mark.asyncio
async def test_run_batched_search_returns_empty_when_no_hits():
    with patch("services.batched_search.search_dork", new=AsyncMock(return_value=[])):
        assert await run_batched_search(["site:naukri.com Python"]) == []


@pytest.mark.asyncio
async def test_extract_jobs_parses_valid_json():
    hits = [
        SearchHit(
            url="https://www.hirist.com/j/1",
            title="Backend Engineer - Foo",
            snippet="Python Bangalore",
            date="2 days ago",
        )
    ]
    raw = """[
      {
        "job_title": "Backend Engineer",
        "company_name": "Foo",
        "job_url": "https://www.hirist.com/j/1",
        "organisation_tier": "startup",
        "description": "Python backend role in Bangalore.",
        "posted_date": null
      }
    ]"""

    class FakeResult:
        final_output = raw

    with patch("job_agents.extraction_agent.Runner.run", new=AsyncMock(return_value=FakeResult())):
        jobs = await extract_jobs(hits)

    assert len(jobs) == 1
    assert jobs[0].company_name == "Foo"
    assert jobs[0].job_url == "https://www.hirist.com/j/1"


@pytest.mark.asyncio
async def test_extract_jobs_drops_stale_posted_dates():
    hits = [
        SearchHit(
            url="https://www.hirist.com/j/2",
            title="Engineer",
            snippet="Role",
            date="2 days ago",
        )
    ]
    raw = """[
      {
        "job_title": "Engineer",
        "company_name": "Foo",
        "job_url": "https://www.hirist.com/j/2",
        "organisation_tier": "startup",
        "description": "Role",
        "posted_date": "2023-08-10"
      }
    ]"""

    class FakeResult:
        final_output = raw

    captured: dict[str, str] = {}

    async def fake_run(agent, prompt):
        captured["prompt"] = prompt
        return FakeResult()

    with patch("job_agents.extraction_agent.Runner.run", side_effect=fake_run):
        jobs = await extract_jobs(hits)

    assert "TODAY is" in captured["prompt"]
    assert '"date": "2 days ago"' in captured["prompt"]
    assert len(jobs) == 1
    assert jobs[0].posted_date is None


def test_sanitise_posted_date_keeps_recent():
    from datetime import date, timedelta

    from job_agents.extraction_agent import _sanitise_posted_date

    today = date(2026, 8, 15)
    assert _sanitise_posted_date(date(2026, 8, 13), today) == date(2026, 8, 13)
    assert _sanitise_posted_date(date(2023, 8, 10), today) is None
    assert _sanitise_posted_date(today + timedelta(days=1), today) is None
    assert _sanitise_posted_date(None, today) is None
