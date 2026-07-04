"""Renders a ComparisonResult as a readable CLI report."""
from __future__ import annotations

from collections import defaultdict
from typing import List, Tuple

import click

from .analysis.base import Finding, Severity
from .comparator import ComparisonResult

_SEVERITY_STYLE = {
    Severity.MAJOR: ("!!", "red"),
    Severity.MINOR: ("! ", "yellow"),
    Severity.INFO: ("i ", "cyan"),
}

_SEVERITY_ORDER = {Severity.MAJOR: 0, Severity.MINOR: 1, Severity.INFO: 2}


def group_findings(findings: List[Finding]) -> List[Tuple[str, List[Finding]]]:
    """Groups findings by category, ordering categories by their most severe finding and
    findings within a category by severity. Shared by the CLI and web report renderers."""
    by_category = defaultdict(list)
    for finding in findings:
        by_category[finding.category].append(finding)

    def category_rank(items: List[Finding]) -> int:
        return min(_SEVERITY_ORDER[f.severity] for f in items)

    ordered = sorted(by_category.items(), key=lambda kv: (category_rank(kv[1]), kv[0]))
    return [
        (category, sorted(items, key=lambda f: _SEVERITY_ORDER[f.severity]))
        for category, items in ordered
    ]


def render_report(result: ComparisonResult, use_color: bool = True) -> str:
    lines = []
    target, top = result.target, result.top

    header = (
        f"{target.context.player_name} on {target.context.fight.name} "
        f"vs top parse ({top.context.player_name})"
    )
    lines.append(click.style(header, bold=True) if use_color else header)
    lines.append("-" * len(header))

    if not result.findings:
        lines.append("No notable issues found -- this parse looks close to the top parse.")
        return "\n".join(lines)

    for category, findings in group_findings(result.findings):
        lines.append("")
        category_header = category.replace("-", " ").title()
        lines.append(click.style(category_header, underline=True) if use_color else category_header)

        for finding in findings:
            marker, color = _SEVERITY_STYLE[finding.severity]
            line = f"  [{marker}] {finding.message}"
            lines.append(click.style(line, fg=color) if use_color else line)
            if finding.detail:
                lines.append(f"       {finding.detail}")

    return "\n".join(lines)
