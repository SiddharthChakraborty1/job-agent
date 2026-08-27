"""Google search via Serper. Google dorks are sent as the query, unchanged."""

from __future__ import annotations

import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

SERPER_URL = "https://google.serper.dev/search"
MAX_RESULTS = 10


def _normalise(row: dict) -> dict[str, str] | None:
    url = (row.get("link") or "").strip()
    title = (row.get("title") or "").strip()
    if not url or not title:
        return None
    snippet = (row.get("snippet") or "").strip()
    # Google/Serper often returns relative dates ("2 days ago") or calendar strings.
    date = (row.get("date") or "").strip()
    item = {"title": title, "url": url, "snippet": snippet[:400]}
    if date:
        item["date"] = date[:80]
    return item


async def search_dork(query: str, max_results: int = MAX_RESULTS) -> list[dict[str, str]]:
    """Run `query` on Google via Serper exactly as provided (dork operators included)."""
    dork = query.strip()
    if not dork:
        return []

    payload = {
        "q": dork,
        "num": max_results,
        "tbs": "qdr:m",  # past month; complements after: in the dork
        "gl": "in",  # geo-target India
        "hl": "en",
        "location": "India",
    }
    headers = {
        "X-API-KEY": settings.serper_api_key,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(SERPER_URL, headers=headers, json=payload)
    except httpx.HTTPError as exc:
        logger.warning("Serper request failed for %r: %s", dork, type(exc).__name__)
        return []

    if response.status_code >= 400:
        logger.warning("Serper HTTP %s for %r", response.status_code, dork)
        return []

    try:
        data = response.json()
    except ValueError:
        logger.warning("Serper returned non-JSON for %r", dork)
        return []

    results: list[dict[str, str]] = []
    seen: set[str] = set()
    for row in data.get("organic") or []:
        item = _normalise(row)
        if item is None or item["url"] in seen:
            continue
        seen.add(item["url"])
        results.append(item)

    logger.info("Serper %r → %d result(s)", dork, len(results))
    return results
