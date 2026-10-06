from typing import Literal
from pydantic import BaseModel, Field


class Probes(BaseModel):
    p_ok: int = Field(ge=0, le=100, description="Estimated probability the primary option is OK")
    freshest: str = Field(description="Source of the freshest report, or NONE")
    comm_issue: Literal["YES", "NO", "UNSURE"]


class DecisionIn(BaseModel):
    action: str
    confidence: int = Field(ge=0, le=100)
    probes: Probes


class MissionCreate(BaseModel):
    scenario_id: str
    seed: int | None = None


class TickIn(BaseModel):
    ticks: int = Field(default=1, ge=1, le=600)
