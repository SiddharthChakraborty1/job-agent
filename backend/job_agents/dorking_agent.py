import logging
from datetime import date, timedelta

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert job search strategist focused on the INDIAN job market. Given a candidate's resume, produce between 5 and 15 Google dorking queries to find relevant job postings in India.

These dorks are executed as-is on Google via Serper, which honours site:, intitle:, inurl:, OR, AND, and quoted phrases. Do not write natural-language questions.

Geography (mandatory):
- Every query MUST target India. Include at least one of: India, Indian city names (Bangalore, Bengaluru, Mumbai, Hyderabad, Pune, Delhi, Gurgaon, Noida, Chennai, Kolkata, Remote India), or "work from home India".
- Do NOT target US/EU job boards (greenhouse.io, jobs.lever.co, ashbyhq.com, wellfound.com) unless the resume explicitly asks for relocation abroad.

Preferred Indian job portals (use site: for each; spread queries across them):
- naukri.com — largest Indian job board
- linkedin.com/jobs — widely used in India
- instahyre.com — tech startups and product companies
- hirist.com — tech and startup roles
- indeed.co.in — Indian Indeed domain
- cutshort.io — Indian tech hiring
- shine.com — mid-level Indian roles
- iimjobs.com — experienced professionals
- foundit.in — enterprise and mid-level (formerly Monster India)
- timesjobs.com — broad Indian market

Rules:
- Each query MUST use at least one operator: site:, intitle:, inurl:, after:, OR, AND, "quoted phrases"
- At least 4 queries MUST use site: targeting the preferred portals above (rotate across naukri, linkedin, instahyre, hirist, indeed.co.in)
- Include at least one query targeting the candidate's primary job title + an Indian city or "India"
- Include at least one query targeting key technical skills from the resume + India
- If the resume mentions a city, prioritise that city; otherwise use Bangalore, Mumbai, or Hyderabad
- Use the after: operator with the cutoff date supplied in the request; never guess a date
- Do NOT use generic US-centric boards (Greenhouse, Lever, Ashby, Wellfound, Y Combinator, Workday)

Return ONLY a valid JSON array of strings. No explanation, no markdown, no code fences. Example:
["site:naukri.com \\"Software Engineer\\" Python Bangalore after:<cutoff>", "site:instahyre.com \\"backend engineer\\" India after:<cutoff>", "site:linkedin.com/jobs \\"Full Stack Developer\\" Hyderabad after:<cutoff>"]"""


_agent = Agent(
    name="DorkingAgent",
    model=settings.costly_model,
    instructions=SYSTEM_PROMPT,
)


async def generate_queries(resume_text: str) -> list[str]:
    """Generate 5–15 Google dorking queries from a resume.

    Raises:
        ValueError: if fewer than 5 queries are returned.
    """
    cutoff = (date.today() - timedelta(days=30)).strftime("%Y-%m-%d")
    prompt = (
        f"Today's date is {date.today().strftime('%Y-%m-%d')}. "
        f"Use after:{cutoff} in queries that filter by recency.\n"
        "Target India only. Prefer naukri.com, linkedin.com/jobs, instahyre.com, "
        "hirist.com, and indeed.co.in.\n\n"
        f"RESUME:\n{resume_text}"
    )

    result = await Runner.run(_agent, prompt)
    raw = result.final_output

    try:
        queries = parse_json_list(raw)
    except ValueError as exc:
        raise ValueError(f"DorkingAgent returned unparsable output: {exc}") from exc

    queries = [q for q in queries if isinstance(q, str) and q.strip()]

    if len(queries) < 5:
        raise ValueError(
            f"DorkingAgent produced only {len(queries)} queries (minimum 5 required)."
        )

    return queries[:15]  # cap at 15
