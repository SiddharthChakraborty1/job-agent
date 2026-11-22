"""Tests for deterministic batched search."""

from unittest.mock import AsyncMock, patch

import pytest

from job_agents.extraction_agent import extract_jobs
from models.schemas import JobResult
from services.batched_search import (
    MAX_DORKS,
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
        *[f"q{i}" for i in range(20)],
    ]
    result = _dedupe_queries(queries)
    assert result[0] == "site:naukri.com Python"
    assert result[1] == "site:hirist.com Django"
    assert len(result) == MAX_DORKS == 15


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


def test_ats_job_urls_are_prioritised_for_fetch():
    """Lever/Ashby put the job signal in the host, not the path; they must still be fetched."""
    from services.batched_search import _url_priority

    for url in (
        "https://jobs.lever.co/acme/1f2e3d4c-aaaa-bbbb-cccc-1234567890ab",
        "https://jobs.ashbyhq.com/acme/1f2e3d4c-aaaa-bbbb-cccc-1234567890ab",
        "https://boards.greenhouse.io/acme/jobs/4012345",
        "https://job-boards.greenhouse.io/acme/jobs/4012345",
    ):
        assert _url_priority(url) > 0, url


def test_ats_board_root_is_not_prioritised():
    """A company's board index (no specific posting) is not a job listing."""
    from services.batched_search import _url_priority

    assert _url_priority("https://jobs.lever.co/acme") <= 0


def test_dork_prompt_allows_ats_boards_with_india_location():
    from job_agents.dorking_agent import SYSTEM_PROMPT

    lowered = SYSTEM_PROMPT.lower()
    assert "do not target us/eu job boards" not in lowered
    assert "do not use generic us-centric boards" not in lowered
    for host in ("jobs.lever.co", "greenhouse.io", "jobs.ashbyhq.com"):
        assert host in lowered


# Real URL shapes for each supported job site (posting pages vs. board/listing pages).
_POSTING_URLS = [
    "https://jobs.lever.co/acme/1f2e3d4c-aaaa-bbbb-cccc-1234567890ab",
    "https://jobs.eu.lever.co/acme/1f2e3d4c-aaaa-bbbb-cccc-1234567890ab",
    "https://boards.greenhouse.io/acme/jobs/4012345",
    "https://job-boards.greenhouse.io/acme/jobs/4012345",
    "https://job-boards.eu.greenhouse.io/acme/jobs/4012345",
    "https://jobs.ashbyhq.com/acme/1f2e3d4c-aaaa-bbbb-cccc-1234567890ab",
    "https://hr.keka.com/careers/jobdetails/90215",
    "https://kickdrum.keka.com/careers/jobdetails/13983",
    "https://acme.zohorecruit.com/jobs/Careers/123456000001234567/Backend-Engineer",
    "https://acme.zohorecruit.in/jobs/Careers/123456000001234567/Backend-Engineer",
    "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/India-Pune/Senior-Engineer_JR123",
    "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/India-Pune/Senior-Engineer_JR123",
    "https://wd5.myworkdaysite.com/recruiting/acme/External/job/Bengaluru/Engineer_R1",
    "https://jobs.smartrecruiters.com/BoschGroup/744000012345678-backend-engineer",
    "https://apply.workable.com/acme/j/AB12CD34EF/",
    "https://wellfound.com/jobs/3123456-senior-backend-engineer",
    "https://www.workatastartup.com/jobs/79469",
    "https://www.ycombinator.com/companies/warpbuild/jobs/JaSIHEM-senior-staff-fullstack-engineer",
]

_BOARD_URLS = [
    "https://jobs.lever.co/acme",
    "https://boards.greenhouse.io/acme",
    "https://jobs.ashbyhq.com/acme",
    "https://hr.keka.com/careers",
    "https://acme.zohorecruit.com/jobs/Careers",
    "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite",
    "https://jobs.smartrecruiters.com/BoschGroup",
    "https://apply.workable.com/acme/",
    "https://www.workatastartup.com/companies",
]


@pytest.mark.parametrize("url", _POSTING_URLS)
def test_job_site_posting_urls_are_recognised(url):
    from services.batched_search import _is_job_site_posting, _url_priority

    assert _is_job_site_posting(url), url
    assert _url_priority(url) >= 13, url


@pytest.mark.parametrize("url", _BOARD_URLS)
def test_job_site_board_pages_are_not_postings(url):
    from services.batched_search import _is_job_site_posting

    assert not _is_job_site_posting(url), url


def test_job_site_postings_outrank_generic_pages():
    from services.batched_search import _url_priority

    assert _url_priority("https://hr.keka.com/careers/jobdetails/90215") > _url_priority(
        "https://example.com/careers"
    )


def test_dork_prompt_covers_new_job_sites():
    from job_agents.dorking_agent import SYSTEM_PROMPT

    lowered = SYSTEM_PROMPT.lower()
    for site in (
        "keka.com/careers/jobdetails",
        "zohorecruit",
        "myworkdayjobs.com",
        "jobs.smartrecruiters.com",
        "apply.workable.com",
        "wellfound.com/jobs",
        "workatastartup.com/jobs",
    ):
        assert site in lowered, site
