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


def test_validated_jobs_sort_best_fit_first():
    """A strong fit posted yesterday must outrank a weak fit posted today."""
    weak_today = _scored("https://example.com/weak", 30, date(2026, 8, 15))
    strong_yesterday = _scored("https://example.com/strong", 90, date(2026, 8, 14))

    ordered = sort_validated_jobs([weak_today, strong_yesterday])
    assert [job.job_url for job in ordered] == [
        strong_yesterday.job_url,
        weak_today.job_url,
    ]


def test_validated_jobs_same_score_newer_first_undated_last():
    older = _scored("https://example.com/older", 80, date(2026, 7, 1))
    newer = _scored("https://example.com/newer", 80, date(2026, 8, 15))
    undated = _scored("https://example.com/undated", 80, None)

    ordered = sort_validated_jobs([undated, older, newer])
    assert [job.job_url for job in ordered] == [
        newer.job_url,
        older.job_url,
        undated.job_url,
    ]


def test_undated_strong_fit_beats_dated_weak_fit():
    undated_strong = _scored("https://example.com/undated", 95, None)
    dated_weak = _scored("https://example.com/dated", 40, date(2026, 8, 15))

    ordered = sort_validated_jobs([dated_weak, undated_strong])
    assert ordered[0].job_url == undated_strong.job_url
