"""A small local Flask GUI on top of the same comparator used by the CLI."""
from __future__ import annotations

from flask import Flask, render_template, request

from .auth import AuthError
from .client import GraphQLError, WCLClient
from .comparator import ComparisonResult, SpecNotFoundError, run_comparison
from .config import ConfigError
from .fetch import PlayerNotFoundError, ReportNotFoundError, TopParseNotFoundError
from .report import group_findings

FRIENDLY_ERRORS = (
    ConfigError,
    ReportNotFoundError,
    PlayerNotFoundError,
    TopParseNotFoundError,
    SpecNotFoundError,
    GraphQLError,
    AuthError,
)


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/")
    def index():
        return render_template("index.html", values={}, error=None)

    @app.post("/analyze")
    def analyze():
        form = request.form
        values = {
            "report_code": form.get("report_code", "").strip(),
            "fight_id": form.get("fight_id", "").strip(),
            "player_name": form.get("player_name", "").strip(),
            "metric": form.get("metric", "dps").strip() or "dps",
            "top_report_code": form.get("top_report_code", "").strip(),
            "top_fight_id": form.get("top_fight_id", "").strip(),
            "top_player_name": form.get("top_player_name", "").strip(),
        }

        try:
            fight_id = int(values["fight_id"])
        except ValueError:
            return render_template("index.html", values=values, error="Fight ID must be a number.")

        top_fight_id = None
        if values["top_fight_id"]:
            try:
                top_fight_id = int(values["top_fight_id"])
            except ValueError:
                return render_template(
                    "index.html", values=values, error="Top-parse fight ID must be a number."
                )

        try:
            client = WCLClient()
            result: ComparisonResult = run_comparison(
                client,
                code=values["report_code"],
                fight_id=fight_id,
                player_name=values["player_name"],
                metric=values["metric"],
                top_report_code=values["top_report_code"] or None,
                top_fight_id=top_fight_id,
                top_player_name=values["top_player_name"] or None,
            )
        except FRIENDLY_ERRORS as exc:
            return render_template("index.html", values=values, error=str(exc))

        return render_template(
            "result.html",
            result=result,
            grouped_findings=group_findings(result.findings),
        )

    return app


def main() -> None:
    """Entry point for `wow-logs serve` / `python -m wow_log_analyzer.webapp`."""
    create_app().run(debug=False)


if __name__ == "__main__":
    main()
