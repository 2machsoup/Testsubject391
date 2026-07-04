"""A thin GraphQL client for the Warcraft Logs v2 API."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests

from .auth import TokenProvider
from .config import Config


class GraphQLError(RuntimeError):
    """Raised when the API returns a non-200 response or GraphQL-level errors."""


class WCLClient:
    """Executes GraphQL queries against the Warcraft Logs v2 client API."""

    def __init__(self, config: Optional[Config] = None, session: Optional[requests.Session] = None):
        self._config = config or Config.from_env()
        self._session = session or requests.Session()
        self._tokens = TokenProvider(self._config, self._session)

    def execute(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        token = self._tokens.get_token()
        response = self._session.post(
            self._config.api_url,
            json={"query": query, "variables": variables or {}},
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )
        if response.status_code != 200:
            raise GraphQLError(f"API request failed ({response.status_code}): {response.text}")
        payload = response.json()
        if "errors" in payload and payload["errors"]:
            raise GraphQLError(f"GraphQL errors: {payload['errors']}")
        return payload["data"]

    def paginate_events(
        self,
        query: str,
        variables: Dict[str, Any],
        events_path: List[str],
    ) -> List[Dict[str, Any]]:
        """Follow `nextPageTimestamp` to collect every page of a WCL events() query.

        `events_path` is the list of dict keys to walk from the top-level `data`
        payload down to the `events` object (e.g. ["reportData", "report", "events"]).
        """
        all_events: List[Dict[str, Any]] = []
        page_variables = dict(variables)

        while True:
            data = self.execute(query, page_variables)
            events_node = data
            for key in events_path:
                if events_node is None:
                    break
                events_node = events_node.get(key)
            if events_node is None:
                break

            all_events.extend(events_node.get("data") or [])
            next_timestamp = events_node.get("nextPageTimestamp")
            if not next_timestamp:
                break
            page_variables["startTime"] = next_timestamp

        return all_events
