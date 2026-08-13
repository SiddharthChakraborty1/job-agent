from models.schemas import JobResult, ValidatedJobResult


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
