from wow_log_analyzer.data_files import known_avoidable_ability_ids, known_cooldowns


def test_known_avoidable_ability_ids_defaults_to_empty():
    assert known_avoidable_ability_ids(99999) == []


def test_known_cooldowns_defaults_to_empty():
    assert known_cooldowns("Mage", "Fire") == []
