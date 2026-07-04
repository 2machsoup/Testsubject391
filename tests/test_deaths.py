from wow_log_analyzer.analysis.base import Severity
from wow_log_analyzer.analysis.deaths import analyze_deaths
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def test_reports_each_death_of_the_target_player(target_context, top_context):
    target_events = FightEvents(
        deaths=[
            {"targetID": 1, "timestamp": 45_000, "killingAbilityGameID": 200},
            {"targetID": 2, "timestamp": 46_000, "killingAbilityGameID": 200},  # someone else's death
        ]
    )
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=FightEvents())

    findings = analyze_deaths(target, top)

    assert len(findings) == 1
    assert findings[0].severity == Severity.MAJOR
    assert "0:45" in findings[0].message
    assert "Fire Blast" in findings[0].message


def test_no_deaths_no_findings(target_context, top_context):
    target = make_subject(target_context, events=FightEvents())
    top = make_subject(top_context, events=FightEvents())

    assert analyze_deaths(target, top) == []
