from wow_log_analyzer.analysis.avoidable_damage import analyze_avoidable_damage
from wow_log_analyzer.analysis.base import Severity
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def damage_events(ability_id, count):
    return [{"type": "damage", "abilityGameID": ability_id} for _ in range(count)]


def test_heuristic_flags_ability_hit_more_than_top(target_context, top_context):
    target_events = FightEvents(damage_taken=damage_events(200, 4))
    top_events = FightEvents(damage_taken=damage_events(200, 0))
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=top_events)

    findings = analyze_avoidable_damage(target, top)

    assert len(findings) == 1
    assert findings[0].severity == Severity.MAJOR
    assert "Fire Blast" in findings[0].message


def test_heuristic_ignores_small_extra_hit_count(target_context, top_context):
    target_events = FightEvents(damage_taken=damage_events(200, 2))
    top_events = FightEvents(damage_taken=damage_events(200, 1))
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=top_events)

    findings = analyze_avoidable_damage(target, top)
    assert findings == []


def test_explicit_allowlist_flags_any_extra_hit(target_context, top_context):
    target_events = FightEvents(damage_taken=damage_events(200, 1))
    top_events = FightEvents(damage_taken=damage_events(200, 0))
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=top_events)

    findings = analyze_avoidable_damage(target, top, allowlist={200})
    assert len(findings) == 1


def test_explicit_allowlist_ignores_abilities_not_listed(target_context, top_context):
    target_events = FightEvents(damage_taken=damage_events(999, 5))
    top_events = FightEvents(damage_taken=damage_events(999, 0))
    target = make_subject(target_context, events=target_events)
    top = make_subject(top_context, events=top_events)

    findings = analyze_avoidable_damage(target, top, allowlist={200})
    assert findings == []
