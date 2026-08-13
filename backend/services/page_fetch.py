"""Capped page fetch so job-posting HTML cannot overflow the model context."""

from __future__ import annotations

import html as html_lib
import logging
import re
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
    if "html" in content_type.lower() or "<html" in body[:200].lower():
        text = html_to_text(body)
    else:
        text = body.strip()

    if not text:
        return f"<error>No readable text at {url}</error>"

    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n<truncated>"
    return text
