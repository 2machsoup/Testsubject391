"""Compares major cooldown usage counts against the top parse, for specs configured in data/cooldowns.json."""
from __future__ import annotations

from typing import List, Optional

from ..data_files import known_cooldowns
from ..models import ComparisonSubject
from .base import Finding, Severity

CATEGORY = "cooldown-usage"


def _cast_count(events, ability_id: int) -> int:
    return sum(1 for e in events if e.get("abilityGameID") == ability_id)


def analyze_cooldowns(
    target: ComparisonSubject,
    top: ComparisonSubject,
    class_name: Optional[str],
    spec_name: Optional[str],
) -> List[Finding]:
    if not class_name or not spec_name:
        return []

    cooldowns = known_cooldowns(class_name, spec_name)
    if not cooldowns:
        return []

    findings: List[Finding] = []
    for cd in cooldowns:
        ability_id = cd.get("ability_id")
        name = cd.get("name", f"ability#{ability_id}")
        if ability_id is None:
            continue

        target_casts = _cast_count(target.events.casts, ability_id)
        top_casts = _cast_count(top.events.casts, ability_id)

        gap = top_casts - target_casts
        if gap <= 0:
            continue

        severity = Severity.MAJOR if gap >= 2 else Severity.MINOR
        findings.append(
            Finding(
                category=CATEGORY,
                severity=severity,
                message=f"{name} used {target_casts}x vs {top_casts}x in the top parse",
                detail=(
                    f"{target.context.player_name} cast {name} {target_casts} time(s) this fight; "
                    f"the top parse ({top.context.player_name}) cast it {top_casts} time(s)."
                ),
            )
        )

    return findings
