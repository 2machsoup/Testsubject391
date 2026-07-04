from unittest.mock import MagicMock

import pytest

from wow_log_analyzer.auth import AuthError, TokenProvider
from wow_log_analyzer.config import Config


def make_config():
    return Config(client_id="id", client_secret="secret", token_url="https://example.test/token")


def test_get_token_fetches_and_caches():
    session = MagicMock()
    session.post.return_value = MagicMock(
        status_code=200, json=lambda: {"access_token": "tok1", "expires_in": 3600}
    )
    provider = TokenProvider(make_config(), session=session)

    assert provider.get_token() == "tok1"
    assert provider.get_token() == "tok1"
    session.post.assert_called_once()


def test_get_token_refetches_after_expiry(monkeypatch):
    session = MagicMock()
    session.post.side_effect = [
        MagicMock(status_code=200, json=lambda: {"access_token": "tok1", "expires_in": 3600}),
        MagicMock(status_code=200, json=lambda: {"access_token": "tok2", "expires_in": 3600}),
    ]
    provider = TokenProvider(make_config(), session=session)
    assert provider.get_token() == "tok1"

    provider._token.expires_at = 0  # force expiry
    assert provider.get_token() == "tok2"
    assert session.post.call_count == 2


def test_get_token_raises_on_error_status():
    session = MagicMock()
    session.post.return_value = MagicMock(status_code=401, text="invalid client")
    provider = TokenProvider(make_config(), session=session)

    with pytest.raises(AuthError):
        provider.get_token()


def test_get_token_raises_on_unexpected_payload():
    session = MagicMock()
    session.post.return_value = MagicMock(status_code=200, json=lambda: {"weird": "payload"})
    provider = TokenProvider(make_config(), session=session)

    with pytest.raises(AuthError):
        provider.get_token()
