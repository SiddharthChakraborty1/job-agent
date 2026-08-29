from typing import Literal, Optional

from pydantic import BaseModel, Field

from models.schemas import SkillGap, UnscoredJobResult, ValidatedJobResult

ApplicationStatus = Literal["not_applied", "applied", "interviewing", "rejected"]


class SavedRunOut(BaseModel):
    id: str
    savedAt: str
    cities: list[str] = []
    validated: list[ValidatedJobResult] = []
    unscored: list[UnscoredJobResult] = []
    warnings: list[str] = []
    skillGaps: list[SkillGap] = []
    newJobUrls: list[str] = []
    newSinceLastCount: Optional[int] = None


class SavedRunSummary(BaseModel):
    id: str
    savedAt: str
    cities: list[str] = []
    validatedCount: int = 0
    unscoredCount: int = 0
    newSinceLastCount: Optional[int] = None
    warnings: list[str] = []


class StatusUpdate(BaseModel):
    job_url: str = Field(min_length=1, max_length=2000)
    status: ApplicationStatus


class StatusMap(BaseModel):
    statuses: dict[str, ApplicationStatus] = {}


class PreferredCitiesUpdate(BaseModel):
    cities: list[str] = Field(default_factory=list, max_length=5)


class PreferredCitiesOut(BaseModel):
    cities: list[str] = []
