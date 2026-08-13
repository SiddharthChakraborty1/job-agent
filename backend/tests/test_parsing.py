"""Tests for tolerant JSON extraction from model output."""

import pytest

from job_agents.parsing import parse_json_list, strip_code_fences


def test_plain_json_array():
    assert parse_json_list('["a", "b"]') == ["a", "b"]


def test_fenced_json_array():
    raw = '```json\n["a", "b"]\n```'
    assert parse_json_list(raw) == ["a", "b"]


def test_fenced_without_language_tag():
    assert parse_json_list('```\n[1, 2]\n```') == [1, 2]


def test_dorking_agent_regression():
    """The exact shape that previously failed: ```json fence with escaped quotes."""
    raw = (
        '```json\n'
        '[\n'
        '  "site:linkedin.com/jobs intitle:\\"Full Stack Developer\\" Django React after:2026-07-13",\n'
        '  "site:indeed.com \\"backend developer\\" Python Django after:2026-07-13"\n'
        ']\n'
        '```'
    )
    queries = parse_json_list(raw)
    assert len(queries) == 2
    assert queries[0].startswith("site:linkedin.com/jobs")
    assert '"Full Stack Developer"' in queries[0]


def test_unterminated_fence_from_truncated_output():
    assert parse_json_list('```json\n["a"]') == ["a"]


def test_leading_prose_is_ignored():
    raw = 'Here are the queries:\n[{"q": 1}]'
    assert parse_json_list(raw) == [{"q": 1}]


def test_non_list_json_rejected():
    with pytest.raises(ValueError, match="expected a JSON array"):
        parse_json_list('{"queries": []}')


def test_unparsable_output_rejected():
    with pytest.raises(ValueError, match="no JSON array found"):
        parse_json_list("I cannot help with that request.")


def test_strip_fences_leaves_plain_text_untouched():
    assert strip_code_fences('  ["a"]  ') == '["a"]'
