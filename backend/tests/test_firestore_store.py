from models.schemas import ValidatedJobResult
from services.firestore_store import diff_new_job_urls


def test_diff_new_job_urls_first_run():
    urls, count = diff_new_job_urls(
        None,
        [{"job_url": "https://example.com/1"}],
        [],
    )
    assert urls == []
    assert count is None


def test_diff_new_job_urls_detects_new():
    previous = {
        "validated": [{"job_url": "https://example.com/1"}],
        "unscored": [],
    }
    urls, count = diff_new_job_urls(
        previous,
        [{"job_url": "https://example.com/1"}, {"job_url": "https://example.com/2"}],
        [{"job_url": "https://example.com/3"}],
    )
    assert urls == ["https://example.com/2", "https://example.com/3"]
    assert count == 2


def test_validated_defaults_missing_skills():
    job = ValidatedJobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url="https://example.com/1",
        organisation_tier="startup",
        description="Build APIs",
        alignment_score=80,
        justification="Fit",
    )
    assert job.missing_skills == []
