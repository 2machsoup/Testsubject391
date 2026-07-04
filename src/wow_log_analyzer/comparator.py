"""Ties the fetch layer and analysis modules together into one end-to-end comparison."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .analysis.avoidable_damage import analyze_avoidable_damage
from .analysis.base import Finding
from .analysis.cooldowns import analyze_cooldowns
from .analysis.deaths import analyze_deaths
from .analysis.interrupts import analyze_interrupts
from .analysis.performance import analyze_performance
from .analysis.uptime import analyze_uptime
from .client import WCLClient
from .fetch import build_comparison_subject, resolve_top_parse
from .models import ComparisonSubject


class SpecNotFoundError(RuntimeError):
    pass


@dataclass
class ComparisonResult:
    target: ComparisonSubject
    top: ComparisonSubject
    findings: List[Finding] = field(default_factory=list)


def run_comparison(
    client: WCLClient,
    code: str,
    fight_id: int,
    player_name: str,
    metric: str = "dps",
    top_report_code: Optional[str] = None,
    top_fight_id: Optional[int] = None,
    top_player_name: Optional[str] = None,
) -> ComparisonResult:
    """Fetches the target report and the best comparable top parse, then runs every analysis module."""
    target = build_comparison_subject(client, code, fight_id, player_name, metric, label=player_name)

    if top_report_code and top_fight_id and top_player_name:
        top = build_comparison_subject(
            client, top_report_code, top_fight_id, top_player_name, metric, label=f"{top_player_name} (top parse)"
        )
    else:
        if not target.class_name or not target.spec_name:
            raise SpecNotFoundError(
                f"Could not determine class/spec for {player_name} from report rankings; "
                "pass --top-report/--top-fight/--top-player to compare against a specific log instead."
            )
        top_info = resolve_top_parse(
            client,
            encounter_id=target.context.fight.encounter_id,
            class_name=target.class_name,
            spec_name=target.spec_name,
            difficulty=target.context.fight.difficulty,
            metric=metric,
        )
        top = build_comparison_subject(
            client,
            top_info["report_code"],
            top_info["fight_id"],
            top_info["character_name"],
            metric,
            label=f"{top_info['character_name']} (top parse)",
        )

    findings: List[Finding] = []
    findings.extend(analyze_performance(target, top, metric))
    findings.extend(analyze_uptime(target, top))
    findings.extend(analyze_avoidable_damage(target, top))
    findings.extend(analyze_interrupts(target, top))
    findings.extend(analyze_deaths(target, top))
    findings.extend(analyze_cooldowns(target, top, target.class_name, target.spec_name))

    return ComparisonResult(target=target, top=top, findings=findings)
