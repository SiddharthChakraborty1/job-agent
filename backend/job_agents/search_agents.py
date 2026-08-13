import logging
from datetime import date, timedelta
from typing import Any

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list
from job_agents.search_tools import fetch_page, search_web
from models.schemas import JobResult

logger = logging.getLogger(__name__)

MAX_QUERIES_PER_AGENT = 8
MAX_TURNS = 12

SHARED_INSTRUCTIONS_SUFFIX = """
You search Google via Serper. The queries you are given are Google dorks.
They are more accurate than natural-language searches. Treat them as the source of truth.

Rules:
- Call search_web ONCE for EACH listed dork.
- Pass the dork string to search_web EXACTLY as written. Do not rewrite, expand, drop operators,
  or convert it into a plain English query. Keep site:, intitle:, inurl:, after:, quotes, OR, AND.
- After search_web returns URLs, call fetch_page on promising job-posting / careers URLs only.
- Never fetch Google, Bing, or DuckDuckGo result pages.
- At most 8 search_web calls and 8 fetch_page calls, then return JSON immediately.
- Skip a URL if fetch_page fails; continue with the rest.
- Skip companies that clearly do not match your specialty (see your role above).
- organisation_tier is a best guess about the COMPANY (startup / midlevel / enterprise),
  not a copy of your own role. A later step will correct well-known companies.

Return ONLY a JSON array of at most 50 job result objects. No markdown, no explanation.
Schema for each object:
{
  "job_title": "...",
  "company_name": "...",
  "job_url": "...",
  "organisation_tier": "startup|midlevel|enterprise",
  "description": "...",
  "posted_date": "YYYY-MM-DD or null"
}
"""

STARTUP_INSTRUCTIONS = """You are a job search agent specialising in Indian startups and early-stage tech companies.
Prefer results from instahyre.com, hirist.com, cutshort.io, and LinkedIn jobs in India.
Skip listings clearly based outside India (US/EU-only with no India or remote-India option).
Skip well-known MNCs and large IT services firms — they are not startups. Examples: Persistent Systems,
TCS, Infosys, Wipro, HCL, Cognizant, Accenture, Capgemini, IBM, Oracle, Microsoft, Amazon, Google.
""" + SHARED_INSTRUCTIONS_SUFFIX

MIDLEVEL_INSTRUCTIONS = """You are a job search agent specialising in mid-level Indian companies and growing tech firms.
Prefer results from naukri.com, shine.com, indeed.co.in, iimjobs.com, and LinkedIn jobs in India.
Skip listings clearly based outside India (US/EU-only with no India or remote-India option).
Skip obvious seed-stage startups and skip household-name MNCs / large IT services firms
(Persistent Systems, TCS, Infosys, Wipro, Accenture, etc.).
""" + SHARED_INSTRUCTIONS_SUFFIX

ENTERPRISE_INSTRUCTIONS = """You are a job search agent specialising in large Indian enterprises and MNCs with India offices.
Prefer results from naukri.com, linkedin.com/jobs, foundit.in, timesjobs.com, and company careers pages with India locations.
Skip listings clearly based outside India (US/EU-only with no India or remote-India option).
Include large IT services MNCs such as Persistent Systems, TCS, Infosys, Wipro, HCL, Cognizant, Accenture.
Skip obvious seed-stage startups.
""" + SHARED_INSTRUCTIONS_SUFFIX


def _build_search_agent(tier: str, system_prompt: str) -> Agent:
    return Agent(
        name=f"{tier.capitalize()}SearchAgent",
        model=settings.cheap_model,
        instructions=system_prompt,
        tools=[search_web, fetch_page],
    )


async def _run_search(agent: Agent, queries: list[str], tier: str) -> list[JobResult]:
    """Run the agent against the provided dorks and parse the JobResult list."""
    today = date.today()
    cutoff = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    dorks = [q.strip() for q in queries if q.strip()][:MAX_QUERIES_PER_AGENT]

    numbered = "\n".join(f"{i}. {q}" for i, q in enumerate(dorks, start=1))
    prompt = (
        f"Today: {today_str}. Recency cutoff: {cutoff}.\n\n"
        "Run each of these Google dorks through search_web EXACTLY as written:\n"
        f"{numbered}\n\n"
        "Then fetch promising job URLs and return the JSON array of job results."
    )

    try:
        result = await Runner.run(agent, input=prompt, max_turns=MAX_TURNS)
    except Exception as exc:
        logger.error("%sSearchAgent failed: %s", tier.capitalize(), exc)
        raise

    try:
        items: list[Any] = parse_json_list(result.final_output)
    except ValueError as exc:
        logger.warning(
            "%sSearchAgent output was unparsable (%s); returning empty list.",
            tier.capitalize(),
            exc,
        )
        return []

    results: list[JobResult] = []
    for item in items[:50]:
        try:
            results.append(JobResult.model_validate(item))
        except Exception as exc:
            logger.warning("Skipping invalid JobResult from %s agent: %s", tier, exc)

    return results


class StartupSearchAgent:
    def __init__(self) -> None:
        self._agent = _build_search_agent("startup", STARTUP_INSTRUCTIONS)

    async def search(self, queries: list[str]) -> list[JobResult]:
        return await _run_search(self._agent, queries, "startup")


class MidlevelSearchAgent:
    def __init__(self) -> None:
        self._agent = _build_search_agent("midlevel", MIDLEVEL_INSTRUCTIONS)

    async def search(self, queries: list[str]) -> list[JobResult]:
        return await _run_search(self._agent, queries, "midlevel")


class EnterpriseSearchAgent:
    def __init__(self) -> None:
        self._agent = _build_search_agent("enterprise", ENTERPRISE_INSTRUCTIONS)

    async def search(self, queries: list[str]) -> list[JobResult]:
        return await _run_search(self._agent, queries, "enterprise")


startup_agent = StartupSearchAgent()
midlevel_agent = MidlevelSearchAgent()
enterprise_agent = EnterpriseSearchAgent()
