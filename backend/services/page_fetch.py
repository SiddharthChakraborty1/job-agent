"""Capped page fetch so job-posting HTML cannot overflow the model context."""

from __future__ import annotations

import html as html_lib
import json
import logging
import re
from typing import Any
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

MAX_CHARS = 3500
TIMEOUT_SECONDS = 12.0
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_BLOCKED_HOST_SUFFIXES = (
    "google.com",
    "google.co.in",
    "google.co.uk",
    "bing.com",
    "duckduckgo.com",
)


def is_blocked_url(url: str) -> bool:
    """True for search-engine result pages — fetching those is what blew the context window."""
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return any(host == suffix or host.endswith("." + suffix) for suffix in _BLOCKED_HOST_SUFFIXES)


_JSONLD_RE = re.compile(
    r'(?is)<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
)


def _iter_jsonld_nodes(node: Any):
    """Walk JSON-LD (dicts, lists, @graph) and yield every dict node."""
    if isinstance(node, list):
        for item in node:
            yield from _iter_jsonld_nodes(item)
    elif isinstance(node, dict):
        yield node
        if "@graph" in node:
            yield from _iter_jsonld_nodes(node["@graph"])


def _is_job_posting(node: dict) -> bool:
    kind = node.get("@type")
    kinds = kind if isinstance(kind, list) else [kind]
    return "JobPosting" in kinds


def _name_of(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("name") or "").strip()
    if isinstance(value, str):
        return value.strip()
    return ""


def _format_place(place: Any) -> str:
    if isinstance(place, str):
        return place.strip()
    if not isinstance(place, dict):
        return ""
    address = place.get("address", place)
    if isinstance(address, str):
        return address.strip()
    if not isinstance(address, dict):
        return _name_of(place)
    parts = [
        str(address.get("addressLocality") or "").strip(),
        str(address.get("addressRegion") or "").strip(),
        _name_of(address.get("addressCountry")),
    ]
    return ", ".join(part for part in parts if part)


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def extract_job_posting_jsonld(raw_html: str) -> dict[str, Any] | None:
    """Return the first schema.org JobPosting on the page as a compact dict.

    Many job pages (Greenhouse, Lever, LinkedIn, Naukri) embed this block, and it
    is far more reliable than guessing title/company/location/date from page text.
    """
    for block in _JSONLD_RE.findall(raw_html):
        try:
            data = json.loads(html_lib.unescape(block.strip()))
        except ValueError:
            continue
        for node in _iter_jsonld_nodes(data):
            if not _is_job_posting(node):
                continue
            locations = [
                loc
                for loc in (_format_place(p) for p in _as_list(node.get("jobLocation")))
                if loc
            ]
            if not locations:
                locations = [
                    loc
                    for loc in (
                        _name_of(p) for p in _as_list(node.get("applicantLocationRequirements"))
                    )
                    if loc
                ]
            location_type = str(node.get("jobLocationType") or "").upper()
            return {
                "title": str(node.get("title") or "").strip(),
                "company": _name_of(node.get("hiringOrganization")),
                "locations": locations,
                "remote": location_type == "TELECOMMUTE",
                "date_posted": str(node.get("datePosted") or "").strip()[:10] or None,
                "valid_through": str(node.get("validThrough") or "").strip()[:10] or None,
                "employment_type": ", ".join(str(t) for t in _as_list(node.get("employmentType"))),
            }
    return None


def _format_structured(posting: dict[str, Any]) -> str:
    lines = ["STRUCTURED JOB DATA (schema.org JobPosting, authoritative):"]
    labels = (
        ("title", "Title"),
        ("company", "Company"),
        ("date_posted", "Date posted"),
        ("valid_through", "Valid through"),
        ("employment_type", "Employment type"),
    )
    for key, label in labels:
        if posting.get(key):
            lines.append(f"{label}: {posting[key]}")
    if posting.get("locations"):
        lines.append("Locations: " + " | ".join(posting["locations"]))
    lines.append(f"Remote: {'yes' if posting.get('remote') else 'not stated'}")
    return "\n".join(lines)


def html_to_text(raw: str) -> str:
    cleaned = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", raw)
    cleaned = re.sub(r"(?is)<br\s*/?>", "\n", cleaned)
    cleaned = re.sub(r"(?is)</(p|div|h[1-6]|li|tr)>", "\n", cleaned)
    cleaned = re.sub(r"(?is)<[^>]+>", " ", cleaned)
    text = html_lib.unescape(cleaned)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def fetch_page_text(url: str, max_chars: int = MAX_CHARS) -> str:
    """Return readable text from `url`, truncated to `max_chars`."""
    if is_blocked_url(url):
        return f"<error>Refusing to fetch search-engine page: {url}</error>"

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=TIMEOUT_SECONDS,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            response = await client.get(url)
    except httpx.HTTPError as exc:
        logger.info("Fetch failed for %s: %s", url, type(exc).__name__)
        return f"<error>Failed to fetch {url}: {type(exc).__name__}</error>"

    if response.status_code >= 400:
        return f"<error>Failed to fetch {url}: HTTP {response.status_code}</error>"

    content_type = response.headers.get("content-type", "")
    body = response.text
    structured = ""
    if "html" in content_type.lower() or "<html" in body[:200].lower() or "ld+json" in body:
        posting = extract_job_posting_jsonld(body)
        if posting:
            structured = _format_structured(posting) + "\n\n"
        text = structured + html_to_text(body)
    else:
        text = body.strip()

    if not text:
        return f"<error>No readable text at {url}</error>"

    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n<truncated>"
    return text
