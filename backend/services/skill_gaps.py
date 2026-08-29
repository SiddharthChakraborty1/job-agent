"""Aggregate per-job missing skills into ranked skill-gap insights."""

from __future__ import annotations

from collections import Counter

from models.schemas import SkillGap, ValidatedJobResult

# Show gaps that appear often enough to be actionable.
_MIN_COUNT = 2
_MIN_PERCENTAGE = 15
_TOP_N = 8


def aggregate_skill_gaps(
    validated: list[ValidatedJobResult],
    *,
    top_n: int = _TOP_N,
    min_count: int = _MIN_COUNT,
    min_percentage: int = _MIN_PERCENTAGE,
) -> list[SkillGap]:
    """Roll up missing_skills across scored jobs by frequency.

    Skills are matched case-insensitively; the most common casing is kept.
    """
    if not validated:
        return []

    total = len(validated)
    counts: Counter[str] = Counter()
    display: dict[str, Counter[str]] = {}

    for job in validated:
        seen_in_job: set[str] = set()
        for skill in job.missing_skills:
            key = skill.strip().lower()
            if not key or key in seen_in_job:
                continue
            seen_in_job.add(key)
            counts[key] += 1
            display.setdefault(key, Counter())[skill.strip()] += 1

    gaps: list[SkillGap] = []
    for key, count in counts.most_common():
        percentage = max(1, min(100, round(100 * count / total)))
        if count < min_count and percentage < min_percentage:
            continue
        label = display[key].most_common(1)[0][0]
        gaps.append(SkillGap(skill=label, count=count, percentage=percentage))
        if len(gaps) >= top_n:
            break

    # If nothing met the threshold (tiny result sets), surface the top hits anyway.
    if not gaps and counts:
        for key, count in counts.most_common(min(top_n, 5)):
            percentage = max(1, min(100, round(100 * count / total)))
            label = display[key].most_common(1)[0][0]
            gaps.append(SkillGap(skill=label, count=count, percentage=percentage))

    return gaps
