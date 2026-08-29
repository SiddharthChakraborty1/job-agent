from models.schemas import ValidatedJobResult
from services.skill_gaps import aggregate_skill_gaps


def _job(url: str, missing: list[str]) -> ValidatedJobResult:
    return ValidatedJobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url=url,
        organisation_tier="startup",
        description="Build APIs",
        alignment_score=70,
        justification="Partial fit",
        missing_skills=missing,
    )


def test_aggregate_skill_gaps_ranks_by_frequency():
    jobs = [
        _job("https://example.com/1", ["Kubernetes", "gRPC"]),
        _job("https://example.com/2", ["kubernetes", "AWS"]),
        _job("https://example.com/3", ["gRPC"]),
        _job("https://example.com/4", ["Kubernetes"]),
        _job("https://example.com/5", []),
    ]

    gaps = aggregate_skill_gaps(jobs)

    assert [g.skill for g in gaps[:2]] == ["Kubernetes", "gRPC"]
    assert gaps[0].count == 3
    assert gaps[0].percentage == 60
    assert gaps[1].count == 2
    assert gaps[1].percentage == 40


def test_aggregate_skill_gaps_empty_when_no_jobs():
    assert aggregate_skill_gaps([]) == []


def test_missing_skills_normalized_on_schema():
    extras = [f"skill-{i}" for i in range(10)]
    job = ValidatedJobResult(
        job_title="Engineer",
        company_name="Acme",
        job_url="https://example.com/1",
        organisation_tier="startup",
        description="Build APIs",
        alignment_score=70,
        justification="Fit",
        missing_skills=["  Kubernetes ", "kubernetes", "", "x" * 80, *extras],
    )
    assert job.missing_skills[0] == "Kubernetes"
    assert len(job.missing_skills) == 8
    assert all(len(s) <= 60 for s in job.missing_skills)
    assert len({s.lower() for s in job.missing_skills}) == len(job.missing_skills)
