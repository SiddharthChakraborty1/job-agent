"""Location is filtered in code from extracted fields, not by prompt instructions."""

from models.schemas import JobResult
from services.deduplicator import deduplicate
from services.location_filter import filter_by_location, is_india


def _job(url: str, country: str | None, remote: bool | None = None, **kw) -> JobResult:
    return JobResult(
        job_title=kw.get("title", "Senior Backend Engineer"),
        company_name=kw.get("company", "Acme"),
        job_url=url,
        organisation_tier="startup",
        description="Build APIs",
        location=kw.get("location"),
        country=country,
        remote=remote,
    )


def test_is_india_accepts_common_spellings():
    for value in ("India", "india", "IN", "IND", " India "):
        assert is_india(value), value
    for value in ("United States", "US", "Germany", ""):
        assert not is_india(value), value


def test_filter_drops_known_non_india_keeps_india_and_unknown():
    india = _job("https://x/1", "India")
    us = _job("https://x/2", "United States")
    us_remote = _job("https://x/3", "United States", remote=True)
    unknown = _job("https://x/4", None)

    kept = filter_by_location([india, us, us_remote, unknown])
    assert [j.job_url for j in kept] == ["https://x/1", "https://x/4"]


def test_location_fields_are_optional_for_old_payloads():
    job = JobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url="https://x/1",
        organisation_tier="startup",
        description="Build APIs",
    )
    assert job.location is None and job.country is None and job.remote is None


def test_dedupe_same_role_posted_on_multiple_sites():
    lever = _job("https://jobs.lever.co/acme/1", "India", location="Bengaluru", company="Acme Inc.")
    naukri = _job("https://www.naukri.com/job-listings-acme-123", "India", location="bengaluru", company="acme")
    other_city = _job("https://www.naukri.com/job-listings-acme-456", "India", location="Pune", company="Acme")

    kept = deduplicate([lever, naukri, other_city])
    assert [j.job_url for j in kept] == [lever.job_url, other_city.job_url]


def test_dedupe_keeps_different_titles_at_same_company():
    a = _job("https://x/a", "India", title="Senior Backend Engineer", location="Pune")
    b = _job("https://x/b", "India", title="Staff Backend Engineer", location="Pune")
    assert len(deduplicate([a, b])) == 2
