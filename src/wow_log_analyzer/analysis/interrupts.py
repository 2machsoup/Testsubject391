"""Compares successful interrupt counts against the top parse."""
from __future__ import annotations

from typing import List

from ..models import ComparisonSubject
from .base import Finding, Severity

CATEGORY = "interrupts"


def analyze_interrupts(target: ComparisonSubject, top: ComparisonSubject) -> List[Finding]:
    target_count = len(target.events.interrupts)
    top_count = len(top.events.interrupts)

    gap = top_count - target_count
    if gap <= 0:
        return []

    severity = Severity.MAJOR if gap >= 3 else Severity.MINOR
    return [
        Finding(
            category=CATEGORY,
            severity=severity,
            message=f"{target_count} interrupts landed vs {top_count} in the top parse",
            detail=(
                f"{target.context.player_name} landed {target_count} interrupt(s) this fight; "
                f"the top parse ({top.context.player_name}) landed {top_count}."
            ),
        )
    ]
