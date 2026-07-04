from wow_log_analyzer.analysis import cooldowns as cooldowns_module
from wow_log_analyzer.analysis.base import Severity
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def cast_events(ability_id, count):
    return [{"abilityGameID": ability_id} for _ in range(count)]


def test_no_findings_when_spec_not_configured(target_context, top_context, monkeypatch):
    monkeypatch.setattr(cooldowns_module, "known_cooldowns", lambda c, s: [])
    target = make_subject(target_context, events=FightEvents())
    top = make_subject(top_context, events=FightEvents())

    findings = cooldowns_module.analyze_cooldowns(target, top, "Mage", "Fire")
    assert findings == []


def test_flags_underused_cooldown(target_context, top_context, monkeypatch):
    monkeypatch.setattr(
        cooldowns_module,
        "known_cooldowns",
        lambda c, s: [{"name": "Combustion", "ability_id": 100}],
    )
    target = make_subject(target_context, events=FightEvents(casts=cast_events(100, 1)))
    top = make_subject(top_context, events=FightEvents(casts=cast_events(100, 3)))

    findings = cooldowns_module.analyze_cooldowns(target, top, "Mage", "Fire")

    assert len(findings) == 1
    assert findings[0].severity == Severity.MAJOR
    assert "Combustion" in findings[0].message


def test_no_finding_when_target_matches_top(target_context, top_context, monkeypatch):
    monkeypatch.setattr(
        cooldowns_module,
        "known_cooldowns",
        lambda c, s: [{"name": "Combustion", "ability_id": 100}],
    )
    target = make_subject(target_context, events=FightEvents(casts=cast_events(100, 3)))
    top = make_subject(top_context, events=FightEvents(casts=cast_events(100, 3)))

    findings = cooldowns_module.analyze_cooldowns(target, top, "Mage", "Fire")
    assert findings == []
