"""Tools the search agents use: Serper (exact Google dork) + capped page fetch."""

from __future__ import annotations

import json

from agents import function_tool

from services.page_fetch import fetch_page_text
from services.serper import search_dork


@function_tool
async def search_web(query: str) -> str:
    """Search Google via Serper. Pass the Google dork EXACTLY as given — do not rewrite it.

    Args:
        query: The full Google dork, including operators such as site:, intitle:, inurl:, after:.
    """
    results = await search_dork(query)
    if not results:
        return json.dumps({"query": query, "results": [], "note": "No results."})
    return json.dumps({"query": query, "results": results})


@function_tool
async def fetch_page(url: str) -> str:
    """Fetch a job posting or careers page and return readable text (max ~3500 characters).

    Do not fetch Google, Bing, or DuckDuckGo result pages.

    Args:
        url: Direct URL of a job posting or job-board listing.
    """
    return await fetch_page_text(url)
