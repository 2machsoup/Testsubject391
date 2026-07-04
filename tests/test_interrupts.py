from wow_log_analyzer.analysis.base import Severity
from wow_log_analyzer.analysis.interrupts import analyze_interrupts
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def test_flags_interrupt_gap(target_context, top_context):
    target = make_subject(target_context, events=FightEvents(interrupts=[{}]))
    top = make_subject(top_context, events=FightEvents(interrupts=[{}, {}, {}, {}]))

    findings = analyze_interrupts(target, top)

    assert len(findings) == 1
    assert findings[0].severity == Severity.MAJOR


def test_no_finding_when_target_matches_or_beats_top(target_context, top_context):
    target = make_subject(target_context, events=FightEvents(interrupts=[{}, {}]))
    top = make_subject(top_context, events=FightEvents(interrupts=[{}, {}]))

    assert analyze_interrupts(target, top) == []
