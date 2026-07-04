from wow_log_analyzer.analysis.base import Severity
from wow_log_analyzer.analysis.uptime import analyze_uptime, compute_uptime_ms
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def test_compute_uptime_ms_handles_apply_remove(fight):
    events = [
        {"timestamp": 0, "type": "applybuff", "abilityGameID": 100},
        {"timestamp": 30_000, "type": "removebuff", "abilityGameID": 100},
    ]
    uptime = compute_uptime_ms(events, fight)
    assert uptime[100] == 30_000


def test_compute_uptime_ms_handles_still_active_at_fight_end(fight):
    events = [{"timestamp": 10_000, "type": "applybuff", "abilityGameID": 100}]
    uptime = compute_uptime_ms(events, fight)
    assert uptime[100] == fight.end_time - 10_000


def test_analyze_uptime_flags_large_gap(target_context, top_context):
    target_events = FightEvents(
        buffs=[
            {"timestamp": 0, "type": "applybuff", "abilityGameID": 100},
            {"timestamp": 30_000, "type": "removebuff", "abilityGameID": 100},
        ]
    )
    top_events = FightEvents(
        buffs=[
            {"timestamp": 0, "type": "applybuff", "abilityGameID": 100},
            {"timestamp": 90_000, "type": "removebuff", "abilityGameID": 100},
        ]
    )
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=top_events)

    findings = analyze_uptime(target, top)

    assert len(findings) == 1
    assert findings[0].severity == Severity.MAJOR
    assert "Combustion" in findings[0].message


def test_analyze_uptime_ignores_small_gap(target_context, top_context):
    target_events = FightEvents(
        buffs=[
            {"timestamp": 0, "type": "applybuff", "abilityGameID": 100},
            {"timestamp": 85_000, "type": "removebuff", "abilityGameID": 100},
        ]
    )
    top_events = FightEvents(
        buffs=[
            {"timestamp": 0, "type": "applybuff", "abilityGameID": 100},
            {"timestamp": 90_000, "type": "removebuff", "abilityGameID": 100},
        ]
    )
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=top_events)

    findings = analyze_uptime(target, top)
    assert findings == []


def test_analyze_uptime_ignores_incidental_buffs(target_context, top_context):
    # Top parse only had the buff up for 5% of the fight -- not meaningful, shouldn't be flagged
    # even though target never had it at all.
    top_events = FightEvents(
        buffs=[
            {"timestamp": 0, "type": "applybuff", "abilityGameID": 100},
            {"timestamp": 5_000, "type": "removebuff", "abilityGameID": 100},
        ]
    )
    target = make_subject(target_context, events=FightEvents())
    top = make_subject(top_context, events=top_events)

    findings = analyze_uptime(target, top)
    assert findings == []
