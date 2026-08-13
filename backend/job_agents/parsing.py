"""Helpers for reading JSON out of LLM responses.

Models frequently wrap JSON in markdown fences or add a sentence of prose despite
being told not to, so every agent parses its output through here.
"""

from __future__ import annotations

import json
import re
from typing import Any

_FENCED = re.compile(r"^```[^\n]*\n(?P<body>.*?)(?:\n```|```)?\s*$", re.DOTALL)


def strip_code_fences(raw: str) -> str:
    """Remove a surrounding ```json ... ``` fence if present.

    Handles unterminated fences, which occur when a response is truncated.
    """
    text = raw.strip()
    if not text.startswith("```"):
        return text
    match = _FENCED.match(text)
    if not match:
        return text.strip("`").strip()
    return match.group("body").removesuffix("```").strip()


def parse_json_list(raw: str) -> list[Any]:
    """Parse a JSON array from model output.

    Raises:
        ValueError: if no JSON array can be recovered from the text.
    """
    text = strip_code_fences(raw)

    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        # Fall back to the outermost bracketed span, in case of leading prose.
        start, end = text.find("["), text.rfind("]")
        if start == -1 or end <= start:
            raise ValueError(f"no JSON array found in output: {text[:200]}") from exc
        try:
            value = json.loads(text[start : end + 1])
        except json.JSONDecodeError as inner:
            raise ValueError(f"malformed JSON array in output: {text[:200]}") from inner

    if not isinstance(value, list):
        raise ValueError(f"expected a JSON array, got {type(value).__name__}")
    return value
