from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date


def _clip(value: object, limit: int) -> object:
    if isinstance(value, str) and len(value) > limit:
        return value[: limit - 3] + "..."
    return value


class JobResult(BaseModel):
    job_title: str
    company_name: str
    job_url: str
    organisation_tier: str  # "startup" | "midlevel" | "enterprise"
    description: str = Field(max_length=300)
    posted_date: Optional[date] = None

    @field_validator("description", mode="before")
    @classmethod
    def clip_description(cls, value: object) -> object:
        return _clip(value, 300)


class ValidatedJobResult(JobResult):
    alignment_score: int = Field(ge=0, le=100)
    justification: str = Field(max_length=600)
    missing_skills: list[str] = Field(default_factory=list)

    @field_validator("justification", mode="before")
    @classmethod
    def clip_justification(cls, value: object) -> object:
        return _clip(value, 600)

    @field_validator("missing_skills", mode="before")
    @classmethod
    def normalize_missing_skills(cls, value: object) -> list[str]:
        if not value:
            return []
        if not isinstance(value, list):
            return []
        skills: list[str] = []
        seen: set[str] = set()
        for item in value:
            if not isinstance(item, str):
                continue
            skill = item.strip()
            if not skill:
                continue
            skill = skill[:60]
            key = skill.lower()
            if key in seen:
                continue
            seen.add(key)
            skills.append(skill)
            if len(skills) >= 8:
                break
        return skills


class UnscoredJobResult(JobResult):
    pass


class SkillGap(BaseModel):
    skill: str
    count: int = Field(ge=1)
    percentage: int = Field(ge=1, le=100)


class PipelineEvent(BaseModel):
    event: str  # "progress" | "result" | "warning" | "error" | "done"
    message: Optional[str] = None
    data: Optional[dict] = None


class PipelineResponse(BaseModel):
    validated: list[ValidatedJobResult] = []
    unscored: list[UnscoredJobResult] = []
    warnings: list[str] = []
    skill_gaps: list[SkillGap] = []
    # Populated when the run is persisted to Firestore (or computed for the client).
    run_id: Optional[str] = None
    saved_at: Optional[str] = None
    new_job_urls: list[str] = []
    new_since_last_count: Optional[int] = None
