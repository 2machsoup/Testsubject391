from unittest.mock import MagicMock

import pytest

from wow_log_analyzer import webapp as webapp_module
from wow_log_analyzer.comparator import ComparisonResult
from wow_log_analyzer.fetch import ReportNotFoundError
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(webapp_module, "WCLClient", lambda: MagicMock())
    app = webapp_module.create_app()
    app.testing = True
    return app.test_client()


def test_index_renders_form(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Report code" in response.data


def test_analyze_renders_findings(client, monkeypatch, target_context, top_context):
    target = make_subject(target_context, events=FightEvents())
    top = make_subject(top_context, events=FightEvents())
    result = ComparisonResult(target=target, top=top, findings=[])

    monkeypatch.setattr(webapp_module, "run_comparison", lambda *a, **k: result)

    response = client.post(
        "/analyze",
        data={"report_code": "ABC123", "fight_id": "1", "player_name": "Alice", "metric": "dps"},
    )

    assert response.status_code == 200
    assert b"No notable issues found" in response.data
    assert b"Alice" in response.data


def test_analyze_rejects_non_numeric_fight_id(client):
    response = client.post(
        "/analyze",
        data={"report_code": "ABC123", "fight_id": "not-a-number", "player_name": "Alice"},
    )

    assert response.status_code == 200
    assert b"Fight ID must be a number" in response.data


def test_analyze_shows_friendly_error_on_missing_report(client, monkeypatch):
    def raise_not_found(*a, **k):
        raise ReportNotFoundError("Report 'BAD' was not found (or is private).")

    monkeypatch.setattr(webapp_module, "run_comparison", raise_not_found)

    response = client.post(
        "/analyze",
        data={"report_code": "BAD", "fight_id": "1", "player_name": "Alice"},
    )

    assert response.status_code == 200
    assert b"was not found" in response.data
