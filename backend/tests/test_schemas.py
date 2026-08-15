from datetime import date

from models.schemas import JobResult, ValidatedJobResult
from services.pipeline import sort_validated_jobs


def test_long_description_is_clipped_not_rejected():
    job = JobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url="https://example.com/jobs/1",
        organisation_tier="startup",
        description="x" * 500,
    )
    assert len(job.description) == 300
    assert job.description.endswith("...")


def test_long_justification_is_clipped_not_rejected():
    job = ValidatedJobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url="https://example.com/jobs/1",
        organisation_tier="startup",
        description="Build APIs",
        alignment_score=80,
        justification="y" * 900,
    )
    assert len(job.justification) == 600
    assert job.justification.endswith("...")


def _scored(url: str, score: int, posted: date | None) -> ValidatedJobResult:
    return ValidatedJobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url=url,
        organisation_tier="startup",
        description="Build APIs",
        posted_date=posted,
        alignment_score=score,
        justification="Fit",
    )


def test_validated_jobs_sort_recent_high_score_first():
    older_high = _scored("https://example.com/a", 95, date(2026, 7, 1))
    newer_low = _scored("https://example.com/b", 40, date(2026, 8, 15))
    newer_high = _scored("https://example.com/c", 90, date(2026, 8, 15))
    undated = _scored("https://example.com/d", 99, None)

    ordered = sort_validated_jobs([older_high, undated, newer_low, newer_high])
    assert [job.job_url for job in ordered] == [
        newer_high.job_url,
        newer_low.job_url,
        older_high.job_url,
        undated.job_url,
    ]
