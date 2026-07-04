"""OAuth2 client_credentials token handling for the Warcraft Logs v2 API."""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

import requests

from .config import Config


class AuthError(RuntimeError):
    """Raised when a token could not be obtained."""


@dataclass
class Token:
    access_token: str
    expires_at: float

    @property
    def expired(self) -> bool:
        # Refresh a little early to avoid racing against expiry mid-request.
        return time.time() >= self.expires_at - 30


class TokenProvider:
    """Fetches and caches an OAuth2 access token via the client_credentials grant."""

    def __init__(self, config: Config, session: Optional[requests.Session] = None):
        self._config = config
        self._session = session or requests.Session()
        self._token: Optional[Token] = None

    def get_token(self) -> str:
        if self._token is None or self._token.expired:
            self._token = self._fetch_token()
        return self._token.access_token

    def _fetch_token(self) -> Token:
        response = self._session.post(
            self._config.token_url,
            data={"grant_type": "client_credentials"},
            auth=(self._config.client_id, self._config.client_secret),
            timeout=30,
        )
        if response.status_code != 200:
            raise AuthError(
                f"Failed to obtain access token ({response.status_code}): {response.text}"
            )
        payload = response.json()
        try:
            access_token = payload["access_token"]
            expires_in = float(payload.get("expires_in", 3600))
        except KeyError as exc:
            raise AuthError(f"Unexpected token response: {payload}") from exc
        return Token(access_token=access_token, expires_at=time.time() + expires_in)
