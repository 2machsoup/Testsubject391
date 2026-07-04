from unittest.mock import MagicMock

import pytest

from wow_log_analyzer import comparator as comparator_module
from wow_log_analyzer.comparator import SpecNotFoundError, run_comparison
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def test_run_comparison_auto_resolves_top_parse(target_context, top_context, monkeypatch):
    target = make_subject(target_context, events=FightEvents(), class_name="Mage", spec_name="Fire")
    top = make_subject(top_context, events=FightEvents())

    calls = {"n": 0}

    def fake_build(client, code, fight_id, player_name, metric, label):
        calls["n"] += 1
        return target if calls["n"] == 1 else top

    monkeypatch.setattr(comparator_module, "build_comparison_subject", fake_build)
    monkeypatch.setattr(
        comparator_module,
        "resolve_top_parse",
        lambda *a, **k: {"report_code": "TOP1", "fight_id": 3, "character_name": "TopParser"},
    )

    result = run_comparison(MagicMock(), "ABC123", 1, "Alice", metric="dps")

    assert result.target is target
    assert result.top is top
    assert isinstance(result.findings, list)


def test_run_comparison_raises_without_spec_or_explicit_top(target_context, monkeypatch):
    target = make_subject(target_context, class_name=None, spec_name=None)
    monkeypatch.setattr(comparator_module, "build_comparison_subject", lambda *a, **k: target)

    with pytest.raises(SpecNotFoundError):
        run_comparison(MagicMock(), "ABC123", 1, "Alice")


def test_run_comparison_uses_explicit_top_when_given(target_context, top_context, monkeypatch):
    target = make_subject(target_context, class_name=None, spec_name=None)
    top = make_subject(top_context)

    calls = {"n": 0}

    def fake_build(client, code, fight_id, player_name, metric, label):
        calls["n"] += 1
        return target if calls["n"] == 1 else top

    monkeypatch.setattr(comparator_module, "build_comparison_subject", fake_build)

    result = run_comparison(
        MagicMock(),
        "ABC123",
        1,
        "Alice",
        top_report_code="TOP1",
        top_fight_id=3,
        top_player_name="TopParser",
    )

    assert result.target is target
    assert result.top is top
