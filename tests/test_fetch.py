from unittest.mock import MagicMock

import pytest

from wow_log_analyzer import fetch
from wow_log_analyzer.fetch import (
    PlayerNotFoundError,
    ReportNotFoundError,
    TopParseNotFoundError,
    build_comparison_subject,
    fetch_rankings,
    fetch_report_metadata,
    find_player_actor,
    find_ranking_entry,
    resolve_top_parse,
)
from wow_log_analyzer.models import Actor


REPORT_METADATA_PAYLOAD = {
    "reportData": {
        "report": {
            "code": "ABC123",
            "fights": [
                {
                    "id": 1,
                    "name": "Test Boss",
                    "difficulty": 5,
                    "kill": True,
                    "startTime": 0,
                    "endTime": 100_000,
                    "encounterID": 1000,
                    "friendlyPlayers": [1, 2],
                }
            ],
            "masterData": {
                "actors": [
                    {"id": 1, "name": "Alice", "type": "Player", "subType": "Mage"},
                    {"id": 2, "name": "Bob", "type": "Player", "subType": "Warrior"},
                ],
                "abilities": [{"gameID": 100, "name": "Combustion", "type": "Ability"}],
            },
        }
    }
}

RANKINGS_PAYLOAD = {
    "reportData": {
        "report": {
            "rankings": {
                "data": [
                    {
                        "fight": 1,
                        "roles": {
                            "dps": {
                                "characters": [
                                    {"name": "Alice", "class": "Mage", "spec": "Fire", "rankPercent": 42.0, "amount": 40000.0}
                                ]
                            }
                        },
                    }
                ]
            }
        }
    }
}


def test_fetch_report_metadata_parses_fights_and_actors():
    client = MagicMock()
    client.execute.return_value = REPORT_METADATA_PAYLOAD

    fights, actors, ability_names = fetch_report_metadata(client, "ABC123")

    assert fights[0].id == 1
    assert fights[0].encounter_id == 1000
    assert actors[1].name == "Alice"
    assert ability_names[100] == "Combustion"


def test_fetch_report_metadata_raises_when_missing():
    client = MagicMock()
    client.execute.return_value = {"reportData": {"report": None}}

    with pytest.raises(ReportNotFoundError):
        fetch_report_metadata(client, "missing")


def test_find_player_actor_case_insensitive():
    actors = {1: Actor(id=1, name="Alice", type="Player")}
    assert find_player_actor(actors, "alice").id == 1


def test_find_player_actor_not_found():
    actors = {1: Actor(id=1, name="Alice", type="Player")}
    with pytest.raises(PlayerNotFoundError):
        find_player_actor(actors, "Carol")


def test_fetch_rankings_flattens_roles():
    client = MagicMock()
    client.execute.return_value = RANKINGS_PAYLOAD

    entries = fetch_rankings(client, "ABC123", 1, metric="dps")
    assert len(entries) == 1
    assert find_ranking_entry(entries, "alice")["amount"] == 40000.0


def test_resolve_top_parse_returns_first_ranking():
    client = MagicMock()
    client.execute.return_value = {
        "worldData": {
            "encounter": {
                "characterRankings": {
                    "rankings": [
                        {"name": "TopParser", "amount": 60000.0, "report": {"code": "TOP1", "fightID": 3}}
                    ]
                }
            }
        }
    }

    result = resolve_top_parse(client, 1000, "Mage", "Fire", 5, "dps")
    assert result == {
        "character_name": "TopParser",
        "amount": 60000.0,
        "report_code": "TOP1",
        "fight_id": 3,
    }


def test_resolve_top_parse_raises_when_empty():
    client = MagicMock()
    client.execute.return_value = {"worldData": {"encounter": {"characterRankings": {"rankings": []}}}}

    with pytest.raises(TopParseNotFoundError):
        resolve_top_parse(client, 1000, "Mage", "Fire", 5, "dps")


def test_build_comparison_subject_wires_everything_together(monkeypatch):
    client = MagicMock()

    def execute_side_effect(query, variables):
        if "ReportMetadata" in query:
            return REPORT_METADATA_PAYLOAD
        if "ReportRankings" in query:
            return RANKINGS_PAYLOAD
        raise AssertionError(f"unexpected query: {query}")

    client.execute.side_effect = execute_side_effect
    client.paginate_events.return_value = []

    subject = build_comparison_subject(client, "ABC123", 1, "Alice", "dps", label="target")

    assert subject.context.player_name == "Alice"
    assert subject.rank_percent == 42.0
    assert subject.class_name == "Mage"
    assert subject.spec_name == "Fire"
