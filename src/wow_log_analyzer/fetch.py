"""High-level functions that combine the GraphQL client + queries into the models used by analysis."""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .client import WCLClient
from .models import Actor, ComparisonSubject, Fight, FightEvents, ReportContext
from .queries import (
    ENCOUNTER_CHARACTER_RANKINGS,
    REPORT_EVENTS,
    REPORT_METADATA,
    REPORT_RANKINGS,
)


class ReportNotFoundError(RuntimeError):
    pass


class PlayerNotFoundError(RuntimeError):
    pass


class TopParseNotFoundError(RuntimeError):
    pass


def fetch_report_metadata(
    client: WCLClient, code: str
) -> Tuple[List[Fight], Dict[int, Actor], Dict[int, str]]:
    data = client.execute(REPORT_METADATA, {"code": code})
    report = data.get("reportData", {}).get("report")
    if report is None:
        raise ReportNotFoundError(f"Report '{code}' was not found (or is private).")

    fights = [
        Fight(
            id=f["id"],
            name=f["name"],
            difficulty=f.get("difficulty"),
            kill=bool(f.get("kill", False)),
            start_time=f["startTime"],
            end_time=f["endTime"],
            encounter_id=f["encounterID"],
            friendly_player_ids=f.get("friendlyPlayers") or [],
        )
        for f in report["fights"]
    ]
    actors = {
        a["id"]: Actor(id=a["id"], name=a["name"], type=a["type"], sub_type=a.get("subType"))
        for a in report["masterData"]["actors"]
    }
    ability_names = {
        a["gameID"]: a["name"] for a in report["masterData"].get("abilities") or []
    }
    return fights, actors, ability_names


def find_fight(fights: List[Fight], fight_id: int) -> Fight:
    for fight in fights:
        if fight.id == fight_id:
            return fight
    raise ValueError(f"Fight id {fight_id} not found in report.")


def find_player_actor(actors: Dict[int, Actor], player_name: str) -> Actor:
    for actor in actors.values():
        if actor.type == "Player" and actor.name.lower() == player_name.lower():
            return actor
    raise PlayerNotFoundError(f"No player named '{player_name}' found in this report.")


def fetch_rankings(
    client: WCLClient, code: str, fight_id: int, metric: str = "dps"
) -> List[Dict[str, Any]]:
    """Returns the flattened list of per-player ranking entries for one fight."""
    data = client.execute(
        REPORT_RANKINGS, {"code": code, "fightIDs": [fight_id], "playerMetric": metric}
    )
    rankings = data.get("reportData", {}).get("report", {}).get("rankings") or {}
    entries: List[Dict[str, Any]] = []
    for fight_ranking in rankings.get("data") or []:
        roles = fight_ranking.get("roles") or {}
        for role in roles.values():
            entries.extend((role or {}).get("characters") or [])
    return entries


def find_ranking_entry(entries: List[Dict[str, Any]], player_name: str) -> Optional[Dict[str, Any]]:
    for entry in entries:
        if entry.get("name", "").lower() == player_name.lower():
            return entry
    return None


def _fetch_events(
    client: WCLClient,
    code: str,
    fight: Fight,
    data_type: str,
    source_id: Optional[int] = None,
    target_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    variables = {
        "code": code,
        "fightIDs": [fight.id],
        "startTime": fight.start_time,
        "endTime": fight.end_time,
        "dataType": data_type,
        "sourceID": source_id,
        "targetID": target_id,
    }
    return client.paginate_events(REPORT_EVENTS, variables, ["reportData", "report", "events"])


def fetch_fight_events(client: WCLClient, code: str, fight: Fight, player_id: int) -> FightEvents:
    return FightEvents(
        casts=_fetch_events(client, code, fight, "Casts", source_id=player_id),
        damage_taken=_fetch_events(client, code, fight, "DamageTaken", target_id=player_id),
        buffs=_fetch_events(client, code, fight, "Buffs", target_id=player_id),
        deaths=_fetch_events(client, code, fight, "Deaths"),
        interrupts=_fetch_events(client, code, fight, "Interrupts", source_id=player_id),
    )


def build_comparison_subject(
    client: WCLClient, code: str, fight_id: int, player_name: str, metric: str, label: str
) -> ComparisonSubject:
    fights, actors, ability_names = fetch_report_metadata(client, code)
    fight = find_fight(fights, fight_id)
    actor = find_player_actor(actors, player_name)

    rankings = fetch_rankings(client, code, fight_id, metric=metric)
    entry = find_ranking_entry(rankings, player_name)

    context = ReportContext(
        code=code,
        fight=fight,
        actors_by_id=actors,
        player_id=actor.id,
        player_name=actor.name,
        ability_names=ability_names,
    )
    events = fetch_fight_events(client, code, fight, actor.id)

    return ComparisonSubject(
        label=label,
        context=context,
        events=events,
        rank_percent=(entry or {}).get("rankPercent"),
        amount=(entry or {}).get("amount"),
        class_name=(entry or {}).get("class"),
        spec_name=(entry or {}).get("spec"),
    )


def resolve_top_parse(
    client: WCLClient,
    encounter_id: int,
    class_name: str,
    spec_name: str,
    difficulty: Optional[int],
    metric: str,
) -> Dict[str, Any]:
    """Finds the #1 ranked parse for a class/spec on an encounter, returning its report code/fight id."""
    data = client.execute(
        ENCOUNTER_CHARACTER_RANKINGS,
        {
            "encounterID": encounter_id,
            "className": class_name,
            "specName": spec_name,
            "difficulty": difficulty,
            "metric": metric,
        },
    )
    payload = data.get("worldData", {}).get("encounter", {}).get("characterRankings") or {}
    rankings = payload.get("rankings") or []
    if not rankings:
        raise TopParseNotFoundError(
            f"No top parses found for {class_name}/{spec_name} on encounter {encounter_id}."
        )
    top = rankings[0]
    report = top.get("report") or {}
    return {
        "character_name": top.get("name"),
        "amount": top.get("amount"),
        "report_code": report.get("code"),
        "fight_id": report.get("fightID"),
    }
