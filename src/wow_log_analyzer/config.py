"""Configuration loaded from environment variables (optionally via a .env file)."""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

TOKEN_URL = "https://www.warcraftlogs.com/oauth/token"
API_URL = "https://www.warcraftlogs.com/api/v2/client"


class ConfigError(RuntimeError):
    """Raised when required configuration is missing."""


@dataclass(frozen=True)
class Config:
    client_id: str
    client_secret: str
    token_url: str = TOKEN_URL
    api_url: str = API_URL

    @classmethod
    def from_env(cls) -> "Config":
        client_id = os.environ.get("WCL_CLIENT_ID")
        client_secret = os.environ.get("WCL_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise ConfigError(
                "WCL_CLIENT_ID and WCL_CLIENT_SECRET must be set. "
                "Register a client at https://www.warcraftlogs.com/api/clients/ "
                "and set them as environment variables (see .env.example)."
            )
        return cls(client_id=client_id, client_secret=client_secret)
