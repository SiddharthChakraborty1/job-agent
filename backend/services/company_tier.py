"""Assign organisation_tier from the company, not from which search agent found the job."""

from __future__ import annotations

import logging
import re

from agents import Agent, Runner

from config import settings
from job_agents.parsing import parse_json_list
from models.schemas import JobResult

logger = logging.getLogger(__name__)

VALID_TIERS = frozenset({"startup", "midlevel", "enterprise"})

# Normalised name → tier. Keys must be output of normalise_company_name().
KNOWN_TIERS: dict[str, str] = {
    # Indian IT services / listed MNCs
    "persistent": "enterprise",
    "persistent systems": "enterprise",
    "tata consultancy services": "enterprise",
    "tcs": "enterprise",
    "infosys": "enterprise",
    "wipro": "enterprise",
    "hcl": "enterprise",
    "hcltech": "enterprise",
    "hcl technologies": "enterprise",
    "tech mahindra": "enterprise",
    "ltimindtree": "enterprise",
    "lti mindtree": "enterprise",
    "mindtree": "enterprise",
    "mphasis": "enterprise",
    "hexaware": "enterprise",
    "coforge": "enterprise",
    "l&t technology services": "enterprise",
    "birlasoft": "enterprise",
    "cyient": "enterprise",
    "zensar": "enterprise",
    "sonata software": "enterprise",
    "kpit": "enterprise",
    "kpit technologies": "enterprise",
    # Global tech / consulting
    "accenture": "enterprise",
    "cognizant": "enterprise",
    "capgemini": "enterprise",
    "ibm": "enterprise",
    "oracle": "enterprise",
    "sap": "enterprise",
    "microsoft": "enterprise",
    "google": "enterprise",
    "alphabet": "enterprise",
    "amazon": "enterprise",
    "amazon web services": "enterprise",
    "aws": "enterprise",
    "meta": "enterprise",
    "facebook": "enterprise",
    "apple": "enterprise",
    "salesforce": "enterprise",
    "adobe": "enterprise",
    "intel": "enterprise",
    "nvidia": "enterprise",
    "cisco": "enterprise",
    "dell": "enterprise",
    "hp": "enterprise",
    "hpe": "enterprise",
    "samsung": "enterprise",
    "siemens": "enterprise",
    "deloitte": "enterprise",
    "pwc": "enterprise",
    "ey": "enterprise",
    "kpmg": "enterprise",
    "jpmorgan": "enterprise",
    "jp morgan": "enterprise",
    "goldman sachs": "enterprise",
    "morgan stanley": "enterprise",
    "hsbc": "enterprise",
    "barclays": "enterprise",
    "citi": "enterprise",
    "citibank": "enterprise",
    "unilever": "enterprise",
    "reliance": "enterprise",
    "reliance industries": "enterprise",
    "jio": "enterprise",
    "flipkart": "enterprise",
    "walmart": "enterprise",
}

_LEGAL_SUFFIX = re.compile(
    r"\b(pvt|private|ltd|limited|inc|llc|llp|corp|corporation|co|the|india)\b",
    re.I,
)


def normalise_company_name(name: str) -> str:
    text = name.lower()
    text = re.sub(r"[^a-z0-9\s&]", " ", text)
    text = _LEGAL_SUFFIX.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def lookup_known_tier(name: str) -> str | None:
    """Return a known tier for `name`, or None if the company is not in the list."""
    normalised = normalise_company_name(name)
    if not normalised:
        return None
    if normalised in KNOWN_TIERS:
        return KNOWN_TIERS[normalised]
    for key, tier in KNOWN_TIERS.items():
        if normalised.startswith(key + " "):
            return tier
    return None


_classifier = Agent(
    name="CompanyTierClassifier",
    model=settings.cheap_model,
    instructions="""You classify companies for a job board.

Assign each company exactly one of: startup, midlevel, enterprise.

- startup: seed to Series B, typically under ~300 people, early product companies
- midlevel: Series C and beyond, growing firms that are not household names
- enterprise: public companies, large IT services firms, MNCs, FAANG-like, 1000+ employees,
  well-known brands (Persistent Systems, TCS, Infosys, Wipro, Accenture, Google, Amazon, …)

Return ONLY a JSON array of objects: {"company_name": "<exact input string>", "tier": "startup|midlevel|enterprise"}
No markdown, no extra keys.""",
)


async def _classify_unknown(names: list[str]) -> dict[str, str]:
    if not names:
        return {}
    prompt = "Classify these companies:\n" + "\n".join(f"- {n}" for n in names)
    try:
        result = await Runner.run(_classifier, prompt)
        items = parse_json_list(result.final_output)
    except Exception as exc:
        logger.warning("Company tier classifier failed (%s); leaving unknown companies unchanged.", exc)
        return {}

    mapping: dict[str, str] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        company = str(item.get("company_name") or "").strip()
        tier = str(item.get("tier") or "").strip().lower()
        if company and tier in VALID_TIERS:
            mapping[normalise_company_name(company)] = tier
    return mapping


async def classify_company_tiers(jobs: list[JobResult]) -> list[JobResult]:
    """Overwrite organisation_tier from known MNCs + one cheap-model pass on the rest."""
    if not jobs:
        return jobs

    unique_norm: dict[str, str] = {}
    for job in jobs:
        key = normalise_company_name(job.company_name)
        if key and key not in unique_norm:
            unique_norm[key] = job.company_name

    mapping: dict[str, str] = {}
    unknown: list[str] = []
    for key, original in unique_norm.items():
        known = lookup_known_tier(original)
        if known:
            mapping[key] = known
        else:
            unknown.append(original)

    if unknown:
        mapping.update(await _classify_unknown(unknown))

    relabelled: list[JobResult] = []
    for job in jobs:
        key = normalise_company_name(job.company_name)
        tier = mapping.get(key, job.organisation_tier)
        if tier not in VALID_TIERS:
            tier = job.organisation_tier
        if tier != job.organisation_tier:
            logger.info(
                "Re-labelled %s: %s → %s",
                job.company_name,
                job.organisation_tier,
                tier,
            )
        relabelled.append(job.model_copy(update={"organisation_tier": tier}))
    return relabelled
