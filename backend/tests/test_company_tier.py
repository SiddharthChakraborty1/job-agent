import pytest

from models.schemas import JobResult
from services.company_tier import classify_company_tiers, lookup_known_tier, normalise_company_name


def test_persistent_systems_is_enterprise():
    assert lookup_known_tier("Persistent Systems") == "enterprise"
    assert lookup_known_tier("Persistent Systems Limited") == "enterprise"
    assert lookup_known_tier("persistent systems pvt ltd") == "enterprise"
    assert lookup_known_tier("Persistent") == "enterprise"


def test_normalise_strips_legal_suffixes():
    assert normalise_company_name("Persistent Systems Ltd.") == "persistent systems"
    assert normalise_company_name("TCS") == "tcs"


def test_unknown_company_is_not_in_denylist():
    assert lookup_known_tier("Some Obscure Seed Startup") is None


def _job(company: str, tier: str) -> JobResult:
    return JobResult(
        job_title="Engineer",
        company_name=company,
        job_url=f"https://example.com/{company}",
        organisation_tier=tier,
        description="Build APIs",
    )


@pytest.mark.asyncio
async def test_classify_relabels_persistent_without_llm(monkeypatch):
    async def fail_if_called(names):
        raise AssertionError(f"LLM should not run for known MNCs, got {names}")

    monkeypatch.setattr("services.company_tier._classify_unknown", fail_if_called)

    jobs = [
        _job("Persistent Systems", "startup"),
        _job("Infosys", "midlevel"),
    ]
    out = await classify_company_tiers(jobs)
    assert out[0].organisation_tier == "enterprise"
    assert out[1].organisation_tier == "enterprise"
    assert out[0].job_title == "Engineer"
