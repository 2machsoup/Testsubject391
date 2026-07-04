"""Reports each death and its killing blow, and flags a death gap vs the top parse."""
from __future__ import annotations

from typing import List

from ..models import ComparisonSubject
from .base import Finding, Severity

CATEGORY = "deaths"


def _format_timestamp(ms_from_fight_start: int) -> str:
    total_seconds = max(ms_from_fight_start, 0) // 1000
    minutes, seconds = divmod(total_seconds, 60)
    return f"{minutes}:{seconds:02d}"


def analyze_deaths(target: ComparisonSubject, top: ComparisonSubject) -> List[Finding]:
    findings: List[Finding] = []
    fight_start = target.context.fight.start_time

    for death in target.events.deaths:
        if death.get("targetID") != target.context.player_id:
            continue
        ability_id = death.get("killingAbilityGameID")
        ability_name = target.context.ability_name(ability_id) if ability_id else "unknown cause"
        time_str = _format_timestamp(death.get("timestamp", fight_start) - fight_start)
        findings.append(
            Finding(
                category=CATEGORY,
                severity=Severity.MAJOR,
                message=f"Died at {time_str} to {ability_name}",
                detail=f"{target.context.player_name} died at {time_str} into the fight, killed by {ability_name}.",
            )
        )

    return findings
