"""Command-line interface: `wow-logs analyze <report_code> ...`"""
from __future__ import annotations

import sys
from typing import Optional

import click

from .client import WCLClient
from .comparator import run_comparison
from .config import ConfigError
from .fetch import PlayerNotFoundError, ReportNotFoundError, TopParseNotFoundError
from .report import render_report


@click.group()
def main() -> None:
    """Fetch a Warcraft Logs report, compare it to a top parse, and report likely issues."""


@main.command()
@click.argument("report_code")
@click.option("--fight", "fight_id", required=True, type=int, help="Fight ID within the report.")
@click.option("--player", "player_name", required=True, help="Character name to analyze.")
@click.option(
    "--metric",
    default="dps",
    show_default=True,
    help="Ranking metric to compare (e.g. dps, hps).",
)
@click.option("--top-report", "top_report_code", default=None, help="Explicit top-parse report code (skips auto lookup).")
@click.option("--top-fight", "top_fight_id", default=None, type=int, help="Fight ID within --top-report.")
@click.option("--top-player", "top_player_name", default=None, help="Character name within --top-report.")
@click.option("--no-color", is_flag=True, help="Disable colored output.")
def analyze(
    report_code: str,
    fight_id: int,
    player_name: str,
    metric: str,
    top_report_code: Optional[str],
    top_fight_id: Optional[int],
    top_player_name: Optional[str],
    no_color: bool,
) -> None:
    """Analyze REPORT_CODE (the code from a warcraftlogs.com report URL)."""
    try:
        client = WCLClient()
        result = run_comparison(
            client,
            code=report_code,
            fight_id=fight_id,
            player_name=player_name,
            metric=metric,
            top_report_code=top_report_code,
            top_fight_id=top_fight_id,
            top_player_name=top_player_name,
        )
    except (ConfigError, ReportNotFoundError, PlayerNotFoundError, TopParseNotFoundError) as exc:
        click.secho(str(exc), fg="red", err=True)
        sys.exit(1)

    click.echo(render_report(result, use_color=not no_color))


@main.command()
@click.option("--host", default="127.0.0.1", show_default=True)
@click.option("--port", default=5000, show_default=True, type=int)
@click.option("--debug", is_flag=True, help="Enable Flask debug/reload mode.")
def serve(host: str, port: int, debug: bool) -> None:
    """Run a local web GUI for the analyzer (requires the 'web' extra: pip install -e '.[web]')."""
    try:
        from .webapp import create_app
    except ImportError:
        click.secho(
            "Flask is not installed. Run: pip install -e '.[web]'", fg="red", err=True
        )
        sys.exit(1)

    create_app().run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
