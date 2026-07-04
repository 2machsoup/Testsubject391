import pytest

from wow_log_analyzer.models import Actor, ComparisonSubject, Fight, FightEvents, ReportContext


def make_fight(fight_id=1, start=0, end=100_000, encounter_id=1000, difficulty=5, kill=True):
    return Fight(
        id=fight_id,
        name="Test Boss",
        difficulty=difficulty,
        kill=kill,
        start_time=start,
        end_time=end,
        encounter_id=encounter_id,
        friendly_player_ids=[1, 2],
    )


def make_context(fight, player_id=1, player_name="Alice", ability_names=None):
    actors = {
        1: Actor(id=1, name="Alice", type="Player", sub_type="Mage"),
        2: Actor(id=2, name="Bob", type="Player", sub_type="Warrior"),
    }
    return ReportContext(
        code="ABC123",
        fight=fight,
        actors_by_id=actors,
        player_id=player_id,
        player_name=player_name,
        ability_names=ability_names or {},
    )


@pytest.fixture
def fight():
    return make_fight()


@pytest.fixture
def target_context(fight):
    return make_context(fight, ability_names={100: "Combustion", 200: "Fire Blast"})


@pytest.fixture
def top_context():
    top_fight = make_fight(fight_id=2)
    return make_context(top_fight, player_name="TopParser", ability_names={100: "Combustion", 200: "Fire Blast"})


def make_subject(context, events=None, rank_percent=90.0, amount=50000.0, class_name="Mage", spec_name="Fire", label=None):
    return ComparisonSubject(
        label=label or context.player_name,
        context=context,
        events=events or FightEvents(),
        rank_percent=rank_percent,
        amount=amount,
        class_name=class_name,
        spec_name=spec_name,
    )
