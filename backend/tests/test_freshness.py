"""Freshness: stale postings are dropped; ranking trades fit against age."""

from datetime import date, timedelta

from models.schemas import JobResult, ValidatedJobResult
from services.freshness import (
    FRESH_DAYS,
    MAX_POSTING_AGE_DAYS,
    age_penalty,
    drop_stale,
)
from services.pipeline import sort_validated_jobs

TODAY = date(2026, 11, 22)


def _job(url: str, posted: date | None) -> JobResult:
    return JobResult(
        job_title="Senior Backend Engineer",
        company_name="Acme",
        job_url=url,
        organisation_tier="startup",
        description="Build APIs",
        posted_date=posted,
    )


def _scored(url: str, score: int, posted: date | None) -> ValidatedJobResult:
    return ValidatedJobResult(**_job(url, posted).model_dump(), alignment_score=score, justification="Fit")


def _days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


def test_eighteen_day_old_posting_is_dropped():
    kept = drop_stale([_job("https://x/old", _days_ago(18)), _job("https://x/new", _days_ago(2))], TODAY)
    assert [j.job_url for j in kept] == ["https://x/new"]


def test_posting_at_the_age_limit_is_kept_and_one_day_past_is_dropped():
    at_limit = _job("https://x/limit", _days_ago(MAX_POSTING_AGE_DAYS))
    past_limit = _job("https://x/past", _days_ago(MAX_POSTING_AGE_DAYS + 1))
    assert [j.job_url for j in drop_stale([at_limit, past_limit], TODAY)] == ["https://x/limit"]


def test_undated_postings_are_kept_by_the_filter():
    assert len(drop_stale([_job("https://x/undated", None)], TODAY)) == 1


def test_no_penalty_inside_fresh_window():
    assert age_penalty(_days_ago(FRESH_DAYS), TODAY) == 0
    assert age_penalty(_days_ago(FRESH_DAYS + 1), TODAY) > 0


def test_fresh_good_fit_beats_older_strong_fit():
    """90 fit posted 10 days ago should rank below 80 fit posted today."""
    older_strong = _scored("https://x/older", 90, _days_ago(10))
    fresh_good = _scored("https://x/fresh", 80, _days_ago(0))
    ordered = sort_validated_jobs([older_strong, fresh_good], today=TODAY)
    assert ordered[0].job_url == "https://x/fresh"


def test_fit_still_wins_within_the_fresh_window():
    """Inside the fresh window, a 90 posted 2 days ago beats a 60 posted today."""
    strong = _scored("https://x/strong", 90, _days_ago(2))
    weak = _scored("https://x/weak", 60, _days_ago(0))
    ordered = sort_validated_jobs([weak, strong], today=TODAY)
    assert ordered[0].job_url == "https://x/strong"


def test_undated_is_penalised_like_an_older_post():
    undated = _scored("https://x/undated", 85, None)
    dated_today = _scored("https://x/today", 75, _days_ago(0))
    ordered = sort_validated_jobs([undated, dated_today], today=TODAY)
    assert ordered[0].job_url == "https://x/today"


def test_displayed_fit_score_is_not_changed_by_ranking():
    older = _scored("https://x/older", 90, _days_ago(10))
    ordered = sort_validated_jobs([older], today=TODAY)
    assert ordered[0].alignment_score == 90


def test_extraction_keeps_month_old_dates_so_they_can_be_dropped():
    """A 30-day-old date must survive sanitising; nulling it made the job look 'undated' and kept it."""
    from job_agents.extraction_agent import _sanitise_posted_date

    assert _sanitise_posted_date(_days_ago(30), TODAY) == _days_ago(30)


def test_dork_prompt_uses_search_window_cutoff():
    from job_agents.dorking_agent import build_dork_prompt
    from services.freshness import SEARCH_WINDOW_DAYS

    cutoff = (date.today() - timedelta(days=SEARCH_WINDOW_DAYS)).strftime("%Y-%m-%d")
    assert f"after:{cutoff}" in build_dork_prompt("resume")
