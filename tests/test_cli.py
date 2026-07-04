from unittest.mock import MagicMock

from click.testing import CliRunner

from wow_log_analyzer import cli as cli_module
from wow_log_analyzer.comparator import ComparisonResult
from wow_log_analyzer.fetch import ReportNotFoundError
from wow_log_analyzer.models import FightEvents

from .conftest import make_subject


def test_analyze_prints_report(monkeypatch, target_context, top_context):
    target = make_subject(target_context, events=FightEvents())
    top = make_subject(top_context, events=FightEvents())
    result = ComparisonResult(target=target, top=top, findings=[])

    monkeypatch.setattr(cli_module, "WCLClient", lambda: MagicMock())
    monkeypatch.setattr(cli_module, "run_comparison", lambda *a, **k: result)

    runner = CliRunner()
    output = runner.invoke(
        cli_module.main,
        ["analyze", "ABC123", "--fight", "1", "--player", "Alice", "--no-color"],
    )

    assert output.exit_code == 0
    assert "No notable issues found" in output.output


def test_analyze_reports_friendly_error_on_missing_report(monkeypatch):
    monkeypatch.setattr(cli_module, "WCLClient", lambda: MagicMock())

    def raise_not_found(*a, **k):
        raise ReportNotFoundError("Report 'BAD' was not found (or is private).")

    monkeypatch.setattr(cli_module, "run_comparison", raise_not_found)

    runner = CliRunner()
    output = runner.invoke(
        cli_module.main,
        ["analyze", "BAD", "--fight", "1", "--player", "Alice"],
    )

    assert output.exit_code == 1
    assert "was not found" in output.output
