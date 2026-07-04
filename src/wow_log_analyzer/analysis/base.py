"""Shared types for analysis modules."""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Severity(Enum):
    INFO = "info"
    MINOR = "minor"
    MAJOR = "major"


@dataclass(frozen=True)
class Finding:
    category: str
    severity: Severity
    message: str
    detail: str = ""
