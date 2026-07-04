"""Loader for the small bundled JSON reference data files (data/*.json)."""
from __future__ import annotations

import json
from functools import lru_cache
from importlib import resources
from typing import Dict, List


@lru_cache(maxsize=1)
def _avoidable_abilities_raw() -> Dict[str, List[int]]:
    with resources.files("wow_log_analyzer.data").joinpath("avoidable_abilities.json").open(
        "r", encoding="utf-8"
    ) as f:
        return json.load(f)


def known_avoidable_ability_ids(encounter_id: int) -> List[int]:
    """Returns the configured avoidable ability IDs for an encounter, or [] if none are configured."""
    raw = _avoidable_abilities_raw()
    return raw.get(str(encounter_id), [])


@lru_cache(maxsize=1)
def _cooldowns_raw() -> Dict[str, List[Dict]]:
    with resources.files("wow_log_analyzer.data").joinpath("cooldowns.json").open(
        "r", encoding="utf-8"
    ) as f:
        return json.load(f)


def known_cooldowns(class_name: str, spec_name: str) -> List[Dict]:
    """Returns the configured major-cooldown list for a '<Class>_<Spec>' key, or [] if unconfigured."""
    raw = _cooldowns_raw()
    return raw.get(f"{class_name}_{spec_name}", [])
