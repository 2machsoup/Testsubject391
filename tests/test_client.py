from unittest.mock import MagicMock

import pytest

from wow_log_analyzer.client import GraphQLError, WCLClient
from wow_log_analyzer.config import Config


def make_client(session):
    config = Config(client_id="id", client_secret="secret")
    client = WCLClient(config=config, session=session)
    client._tokens.get_token = lambda: "faketoken"
    return client


def test_execute_returns_data():
    session = MagicMock()
    session.post.return_value = MagicMock(status_code=200, json=lambda: {"data": {"ok": 1}})
    client = make_client(session)

    assert client.execute("query {}") == {"ok": 1}


def test_execute_raises_on_http_error():
    session = MagicMock()
    session.post.return_value = MagicMock(status_code=500, text="boom")
    client = make_client(session)

    with pytest.raises(GraphQLError):
        client.execute("query {}")


def test_execute_raises_on_graphql_errors():
    session = MagicMock()
    session.post.return_value = MagicMock(
        status_code=200, json=lambda: {"errors": [{"message": "bad field"}], "data": None}
    )
    client = make_client(session)

    with pytest.raises(GraphQLError):
        client.execute("query {}")


def test_paginate_events_follows_next_page_timestamp():
    session = MagicMock()
    session.post.side_effect = [
        MagicMock(
            status_code=200,
            json=lambda: {
                "data": {
                    "reportData": {
                        "report": {"events": {"data": [{"id": 1}], "nextPageTimestamp": 500}}
                    }
                }
            },
        ),
        MagicMock(
            status_code=200,
            json=lambda: {
                "data": {
                    "reportData": {
                        "report": {"events": {"data": [{"id": 2}], "nextPageTimestamp": None}}
                    }
                }
            },
        ),
    ]
    client = make_client(session)

    events = client.paginate_events(
        "query {}", {"startTime": 0, "endTime": 1000}, ["reportData", "report", "events"]
    )

    assert events == [{"id": 1}, {"id": 2}]
    assert session.post.call_count == 2
    second_call_body = session.post.call_args_list[1].kwargs["json"]
    assert second_call_body["variables"]["startTime"] == 500
