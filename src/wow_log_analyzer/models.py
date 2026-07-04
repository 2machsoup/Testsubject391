"""Plain dataclasses used to move parsed report data between the fetch layer and analysis modules."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class Actor:
    id: int
    name: str
    type: str
    sub_type: Optional[str] = None


@dataclass(frozen=True)
class Fight:
    id: int
    name: str
    difficulty: Optional[int]
    kill: bool
    start_time: int
    end_time: int
    encounter_id: int
    friendly_player_ids: List[int] = field(default_factory=list)

    @property
    def duration_ms(self) -> int:
        return self.end_time - self.start_time


@dataclass
class ReportContext:
    """A report plus the subset of fight/actor/ability data relevant to one analysis run."""

    code: str
    fight: Fight
    actors_by_id: Dict[int, Actor]
    player_id: int
    player_name: str
    ability_names: Dict[int, str] = field(default_factory=dict)

    def actor_name(self, actor_id: Optional[int]) -> str:
        if actor_id is None:
            return "unknown"
        actor = self.actors_by_id.get(actor_id)
        return actor.name if actor else f"actor#{actor_id}"

    def ability_name(self, ability_id: Optional[int]) -> str:
        if ability_id is None:
            return "unknown ability"
        return self.ability_names.get(ability_id, f"ability#{ability_id}")


@dataclass
class FightEvents:
    """Raw WCL events for a single fight, already restricted to the time window of that fight."""

    casts: List[Dict[str, Any]] = field(default_factory=list)
    damage_taken: List[Dict[str, Any]] = field(default_factory=list)
    buffs: List[Dict[str, Any]] = field(default_factory=list)
    deaths: List[Dict[str, Any]] = field(default_factory=list)
    interrupts: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ComparisonSubject:
    """Everything needed about one side of a comparison (the target log or the top log)."""

    label: str
    context: ReportContext
    events: FightEvents
    rank_percent: Optional[float] = None
    amount: Optional[float] = None
    class_name: Optional[str] = None
    spec_name: Optional[str] = None
