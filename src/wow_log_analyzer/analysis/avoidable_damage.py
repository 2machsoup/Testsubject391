"""Flags damage taken from mechanics the top parse avoided (or took far less often)."""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List, Optional, Set

from ..data_files import known_avoidable_ability_ids
from ..models import ComparisonSubject
from .base import Finding, Severity

CATEGORY = "avoidable-damage"

# How many more hits than the top parse before we flag it, when we have no
# per-encounter allowlist to work from (pure heuristic mode).
HEURISTIC_MIN_EXTRA_HITS = 2


def _hit_counts(damage_events: List[Dict[str, Any]]) -> Counter:
    counts: Counter = Counter()
    for event in damage_events:
        if event.get("type") != "damage":
            continue
        ability_id = event.get("abilityGameID")
        if ability_id is not None:
            counts[ability_id] += 1
    return counts


def analyze_avoidable_damage(
    target: ComparisonSubject,
    top: ComparisonSubject,
    allowlist: Optional[Set[int]] = None,
) -> List[Finding]:
    findings: List[Finding] = []

    if allowlist is None:
        configured = known_avoidable_ability_ids(target.context.fight.encounter_id)
        allowlist = set(configured) if configured else None

    target_hits = _hit_counts(target.events.damage_taken)
    top_hits = _hit_counts(top.events.damage_taken)

    for ability_id, hits in target_hits.items():
        if allowlist is not None and ability_id not in allowlist:
            continue

        baseline = top_hits.get(ability_id, 0)
        extra = hits - baseline

        if allowlist is None and extra < HEURISTIC_MIN_EXTRA_HITS:
            continue
        if allowlist is not None and extra <= 0:
            continue

        ability_name = target.context.ability_name(ability_id)
        severity = Severity.MAJOR if baseline == 0 and hits >= 3 else Severity.MINOR
        findings.append(
            Finding(
                category=CATEGORY,
                severity=severity,
                message=f"Hit by {ability_name} {hits}x (top parse: {baseline}x)",
                detail=(
                    f"{target.context.player_name} took damage from {ability_name} {hits} time(s) "
                    f"this fight; the top parse ({top.context.player_name}) took it {baseline} time(s)."
                ),
            )
        )

    return findings
