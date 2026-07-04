"""Compares buff uptime (self buffs, trinkets, key rotational buffs) against the top parse."""
from __future__ import annotations

from typing import Any, Dict, List

from ..models import ComparisonSubject, Fight
from .base import Finding, Severity

CATEGORY = "buff-uptime"

# Below this fraction of the fight, a buff in the top parse is considered incidental
# (e.g. a proc that only happened once) rather than something worth chasing.
MEANINGFUL_UPTIME_THRESHOLD = 0.15
GAP_MAJOR_THRESHOLD = 0.25
GAP_MINOR_THRESHOLD = 0.10


def compute_uptime_ms(buff_events: List[Dict[str, Any]], fight: Fight) -> Dict[int, int]:
    """Returns total uptime in ms per abilityGameID, derived from apply/refresh/remove events."""
    active_since: Dict[int, int] = {}
    uptime_ms: Dict[int, int] = {}

    for event in sorted(buff_events, key=lambda e: e.get("timestamp", 0)):
        ability_id = event.get("abilityGameID")
        if ability_id is None:
            continue
        event_type = event.get("type")
        timestamp = event.get("timestamp", fight.start_time)

        if event_type in ("applybuff", "refreshbuff"):
            active_since.setdefault(ability_id, timestamp)
        elif event_type == "removebuff":
            start = active_since.pop(ability_id, None)
            if start is not None:
                uptime_ms[ability_id] = uptime_ms.get(ability_id, 0) + (timestamp - start)

    # Anything still active when our event window ends was active through the end of the fight.
    for ability_id, start in active_since.items():
        uptime_ms[ability_id] = uptime_ms.get(ability_id, 0) + (fight.end_time - start)

    return uptime_ms


def analyze_uptime(target: ComparisonSubject, top: ComparisonSubject) -> List[Finding]:
    findings: List[Finding] = []

    target_uptime = compute_uptime_ms(target.events.buffs, target.context.fight)
    top_uptime = compute_uptime_ms(top.events.buffs, top.context.fight)

    target_duration = max(target.context.fight.duration_ms, 1)
    top_duration = max(top.context.fight.duration_ms, 1)

    for ability_id, top_ms in top_uptime.items():
        top_fraction = top_ms / top_duration
        if top_fraction < MEANINGFUL_UPTIME_THRESHOLD:
            continue

        target_fraction = target_uptime.get(ability_id, 0) / target_duration
        gap = top_fraction - target_fraction
        if gap <= GAP_MINOR_THRESHOLD:
            continue

        ability_name = top.context.ability_name(ability_id) or target.context.ability_name(ability_id)
        severity = Severity.MAJOR if gap >= GAP_MAJOR_THRESHOLD else Severity.MINOR
        findings.append(
            Finding(
                category=CATEGORY,
                severity=severity,
                message=f"{ability_name} uptime is {target_fraction * 100:.0f}% vs {top_fraction * 100:.0f}% in the top parse",
                detail=(
                    f"{target.context.player_name} maintained {ability_name} for "
                    f"{target_fraction * 100:.0f}% of the fight; the top parse "
                    f"({top.context.player_name}) maintained it for {top_fraction * 100:.0f}%."
                ),
            )
        )

    return findings
