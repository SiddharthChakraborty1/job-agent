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

    @field_validator("justification", mode="before")
    @classmethod
    def clip_justification(cls, value: object) -> object:
        return _clip(value, 600)


class UnscoredJobResult(JobResult):
    pass


class PipelineEvent(BaseModel):
    event: str  # "progress" | "result" | "warning" | "error" | "done"
    message: Optional[str] = None
    data: Optional[dict] = None


class PipelineResponse(BaseModel):
    validated: list[ValidatedJobResult] = []
    unscored: list[UnscoredJobResult] = []
    warnings: list[str] = []
