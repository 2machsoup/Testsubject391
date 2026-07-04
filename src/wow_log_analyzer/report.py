"""Renders a ComparisonResult as a readable CLI report."""
from __future__ import annotations

import click

from .analysis.base import Severity
from .comparator import ComparisonResult

_SEVERITY_STYLE = {
    Severity.MAJOR: ("!!", "red"),
    Severity.MINOR: ("! ", "yellow"),
    Severity.INFO: ("i ", "cyan"),
}

_SEVERITY_ORDER = {Severity.MAJOR: 0, Severity.MINOR: 1, Severity.INFO: 2}


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

    findings = sorted(result.findings, key=lambda f: (_SEVERITY_ORDER[f.severity], f.category))

    current_category = None
    for finding in findings:
        if finding.category != current_category:
            current_category = finding.category
            lines.append("")
            category_header = current_category.replace("-", " ").title()
            lines.append(click.style(category_header, underline=True) if use_color else category_header)

        marker, color = _SEVERITY_STYLE[finding.severity]
        line = f"  [{marker}] {finding.message}"
        lines.append(click.style(line, fg=color) if use_color else line)
        if finding.detail:
            lines.append(f"       {finding.detail}")

    return "\n".join(lines)
