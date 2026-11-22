"""Tests for Serper dork search and capped page fetch."""

from unittest.mock import patch

import pytest

from services.page_fetch import fetch_page_text, html_to_text, is_blocked_url
from services.serper import search_dork


@pytest.mark.asyncio
async def test_search_dork_sends_exact_query_to_serper():
    dork = 'site:jobs.lever.co "backend engineer" after:2026-07-13'
    captured: dict[str, object] = {}

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "organic": [
                    {
                        "title": "Backend Engineer",
                        "link": "https://jobs.lever.co/acme/abc",
                        "snippet": "Django",
                        "date": "2 days ago",
                    }
                ]
            }

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, headers=None, json=None):
            captured["url"] = url
            captured["json"] = json
            captured["has_api_key"] = bool((headers or {}).get("X-API-KEY"))
            return FakeResponse()

    with patch("services.serper.httpx.AsyncClient", lambda **kwargs: FakeClient()):
        results = await search_dork(dork)

    assert captured["url"] == "https://google.serper.dev/search"
    assert captured["json"]["q"] == dork
    assert captured["json"]["tbs"] == "qdr:m"
    assert captured["json"]["gl"] == "in"
    assert captured["json"]["hl"] == "en"
    assert captured["json"]["location"] == "India"
    assert captured["has_api_key"] is True
    assert results == [
        {
            "title": "Backend Engineer",
            "url": "https://jobs.lever.co/acme/abc",
            "snippet": "Django",
            "date": "2 days ago",
        }
    ]


@pytest.mark.asyncio
async def test_search_dork_empty_query_does_not_call_serper():
    with patch("services.serper.httpx.AsyncClient") as mock_client:
        assert await search_dork("   ") == []
        mock_client.assert_not_called()


@pytest.mark.asyncio
async def test_search_dork_http_error_returns_empty():
    class FakeResponse:
        status_code = 403

        def json(self):
            return {"message": "Unauthorized"}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            return FakeResponse()

    with patch("services.serper.httpx.AsyncClient", lambda **kwargs: FakeClient()):
        assert await search_dork("site:greenhouse.io Python") == []


def test_html_to_text_strips_tags_and_scripts():
    raw = "<html><script>alert(1)</script><h1>Engineer</h1><p>Build APIs</p></html>"
    text = html_to_text(raw)
    assert "alert" not in text
    assert "Engineer" in text
    assert "Build APIs" in text


def test_blocked_search_engine_urls():
    assert is_blocked_url("https://www.google.com/search?q=python")
    assert is_blocked_url("https://bing.com/search?q=python")
    assert is_blocked_url("https://html.duckduckgo.com/html/?q=python")
    assert not is_blocked_url("https://boards.greenhouse.io/acme/jobs/1")


@pytest.mark.asyncio
async def test_fetch_page_refuses_google_serp():
    text = await fetch_page_text("https://www.google.com/search?q=site:greenhouse.io")
    assert text.startswith("<error>Refusing")


@pytest.mark.asyncio
async def test_fetch_page_truncates(monkeypatch):
    huge_html = "<html><body>" + ("job " * 5000) + "</body></html>"

    class FakeResponse:
        status_code = 200
        headers = {"content-type": "text/html"}
        text = huge_html

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr("services.page_fetch.httpx.AsyncClient", lambda **kwargs: FakeClient())
    text = await fetch_page_text("https://boards.greenhouse.io/acme/jobs/1", max_chars=200)
    assert len(text) <= 200 + len("\n\n<truncated>")
    assert text.endswith("<truncated>")


_JSONLD_PAGE = """<html><head>
<script type="application/ld+json">
{"@context": "https://schema.org", "@graph": [
  {"@type": "Organization", "name": "Ignore Me"},
  {"@type": "JobPosting",
   "title": "Senior Backend Engineer",
   "hiringOrganization": {"@type": "Organization", "name": "Acme Fintech"},
   "datePosted": "2026-11-18",
   "validThrough": "2026-12-31T00:00:00Z",
   "employmentType": "FULL_TIME",
   "jobLocation": [
     {"@type": "Place", "address": {"addressLocality": "Bengaluru", "addressRegion": "KA", "addressCountry": "IN"}},
     {"@type": "Place", "address": {"addressLocality": "Pune", "addressCountry": {"@type": "Country", "name": "India"}}}
   ],
   "description": "<p>Build streaming pipelines</p>"}
]}
</script></head><body><h1>Careers</h1><p>Apply now</p></body></html>"""


def test_extract_job_posting_jsonld_reads_structured_fields():
    from services.page_fetch import extract_job_posting_jsonld

    posting = extract_job_posting_jsonld(_JSONLD_PAGE)
    assert posting is not None
    assert posting["title"] == "Senior Backend Engineer"
    assert posting["company"] == "Acme Fintech"
    assert posting["date_posted"] == "2026-11-18"
    assert posting["locations"] == ["Bengaluru, KA, IN", "Pune, India"]
    assert posting["remote"] is False


def test_extract_job_posting_jsonld_detects_remote():
    from services.page_fetch import extract_job_posting_jsonld

    raw = (
        '<script type="application/ld+json">'
        '{"@type": "JobPosting", "title": "Python Lead", "jobLocationType": "TELECOMMUTE",'
        ' "applicantLocationRequirements": {"@type": "Country", "name": "India"}}'
        "</script>"
    )
    posting = extract_job_posting_jsonld(raw)
    assert posting["remote"] is True
    assert posting["locations"] == ["India"]


def test_extract_job_posting_jsonld_ignores_bad_json_and_non_jobs():
    from services.page_fetch import extract_job_posting_jsonld

    raw = (
        '<script type="application/ld+json">{not json</script>'
        '<script type="application/ld+json">{"@type": "WebSite", "name": "x"}</script>'
    )
    assert extract_job_posting_jsonld(raw) is None


@pytest.mark.asyncio
async def test_fetch_page_keeps_jsonld_job_data(monkeypatch):
    class FakeResponse:
        status_code = 200
        headers = {"content-type": "text/html"}
        text = _JSONLD_PAGE

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr("services.page_fetch.httpx.AsyncClient", lambda **kwargs: FakeClient())
    text = await fetch_page_text("https://boards.greenhouse.io/acme/jobs/1")
    assert text.startswith("STRUCTURED JOB DATA")
    assert "Acme Fintech" in text
    assert "Bengaluru" in text
    assert "2026-11-18" in text
