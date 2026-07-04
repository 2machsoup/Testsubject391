from wow_log_analyzer.analysis.base import Severity
from wow_log_analyzer.analysis.performance import analyze_performance

from .conftest import make_subject


def test_flags_low_percentile_as_major(target_context, top_context):
    target = make_subject(target_context, rank_percent=30.0, amount=40000.0)
    top = make_subject(top_context, rank_percent=99.0, amount=60000.0)

    findings = analyze_performance(target, top, metric="dps")

    percentile_finding = next(f for f in findings if "percentile" in f.message)
    assert percentile_finding.severity == Severity.MAJOR

    gap_finding = next(f for f in findings if "below the #1 parse" in f.message)
    assert gap_finding.severity == Severity.MAJOR


def test_no_findings_when_close_to_top(target_context, top_context):
    target = make_subject(target_context, rank_percent=95.0, amount=59000.0)
    top = make_subject(top_context, rank_percent=99.0, amount=60000.0)

    findings = analyze_performance(target, top, metric="dps")

    for finding in findings:
        assert finding.severity == Severity.INFO
