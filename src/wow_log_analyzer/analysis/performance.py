"""Compares overall output (DPS/HPS) and percentile rank against the top parse."""
from __future__ import annotations

from typing import List

from ..models import ComparisonSubject
from .base import Finding, Severity

CATEGORY = "performance"


def analyze_performance(target: ComparisonSubject, top: ComparisonSubject, metric: str) -> List[Finding]:
    findings: List[Finding] = []
    metric_label = metric.upper()

    if target.rank_percent is not None:
        pct = target.rank_percent
        if pct < 50:
            severity = Severity.MAJOR
        elif pct < 75:
            severity = Severity.MINOR
        else:
            severity = Severity.INFO
        findings.append(
            Finding(
                category=CATEGORY,
                severity=severity,
                message=f"{metric_label} percentile is {pct:.1f}",
                detail=f"{target.context.player_name} ranks at the {pct:.1f} percentile for this fight/spec.",
            )
        )

    if target.amount is not None and top.amount:
        gap_pct = (top.amount - target.amount) / top.amount * 100
        if gap_pct > 20:
            severity = Severity.MAJOR
        elif gap_pct > 5:
            severity = Severity.MINOR
        else:
            severity = Severity.INFO
        findings.append(
            Finding(
                category=CATEGORY,
                severity=severity,
                message=f"{metric_label} is {gap_pct:.1f}% below the #1 parse",
                detail=(
                    f"{target.context.player_name}: {target.amount:.0f} {metric_label} vs "
                    f"top parse ({top.context.player_name}): {top.amount:.0f} {metric_label}."
                ),
            )
        )

    return findings
