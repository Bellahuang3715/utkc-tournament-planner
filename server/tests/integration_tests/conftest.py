# pylint: disable=redefined-outer-name
import asyncio
import os
from asyncio import AbstractEventLoop
from collections.abc import AsyncIterator, Iterator
from time import sleep
from unittest.mock import patch
from urllib.parse import urlparse

import pytest
from databases import Database

from project.config import config
from project.database import database, engine
from project.schema import metadata
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_auth_context

# Never allow drop_all against the local app DB (or any non-test database name).
_FORBIDDEN_TEST_DB_NAMES = frozenset({"bracket_dev", "postgres", "template0", "template1"})


def _database_name_from_dsn(dsn: str) -> str:
    return urlparse(dsn).path.lstrip("/").split("?")[0]


def assert_safe_to_reinit_database() -> None:
    """Refuse to wipe DBs that are not clearly dedicated to tests."""
    db_name = _database_name_from_dsn(str(config.pg_dsn))
    allow_override = os.getenv("ALLOW_DROP_NON_TEST_DB") == "1"
    is_test_named = db_name.endswith(("_test", "_ci")) or db_name == "test"

    if allow_override:
        return

    if db_name in _FORBIDDEN_TEST_DB_NAMES or not is_test_named:
        raise RuntimeError(
            f"Refusing to drop/reinit database {db_name!r}. "
            "Integration tests must use a dedicated test DB "
            "(ci.env → bracket_test). See TESTING.md. "
            "Set ALLOW_DROP_NON_TEST_DB=1 only if you really mean it."
        )


@pytest.fixture(scope="session")
def event_loop() -> AsyncIterator[AbstractEventLoop]:  # type: ignore[misc]
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()

    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def mock_firebase_verify_id_token() -> Iterator[None]:
    """Accept Bearer test:<email> tokens in integration tests."""

    def _verify(token: str, *args: object, **kwargs: object) -> dict[str, str]:
        if token.startswith("test:"):
            email = token.split(":", 1)[1]
            return {"email": email, "name": email.split("@", 1)[0]}
        raise ValueError("Invalid test token")

    with patch("project.routes.auth.auth.verify_id_token", side_effect=_verify):
        yield


@pytest.fixture(scope="session", autouse=True)
async def reinit_database(event_loop: AbstractEventLoop, worker_id: str) -> AsyncIterator[Database]:
    """
    Creates the test database on the first test run in the session.

    When running in parallel, the first test runner (gw0) creates a "lock" file and initializes the
    database. The other runners poll this file and wait until it has been removed by gw0.
    When running tests sequentially, the master worker just creates the test database and that's it.
    """
    assert_safe_to_reinit_database()
    await database.connect()

    if worker_id == "master":
        metadata.drop_all(engine)
        metadata.create_all(engine)

        try:
            yield database
        finally:
            await database.disconnect()

        return

    lock_path = "/tmp/tm_test_lock"

    if worker_id == "gw0":
        try:
            with open(lock_path, mode="w") as file:
                file.write("")

            metadata.drop_all(engine)
            metadata.create_all(engine)
        finally:
            os.remove(lock_path)
    else:
        for _ in range(50):
            sleep(0.1)
            if not os.path.exists(lock_path):
                break

    try:
        yield database
    finally:
        await database.disconnect()


@pytest.fixture(scope="session")
async def auth_context(reinit_database: Database) -> AsyncIterator[AuthContext]:
    async with reinit_database, inserted_auth_context() as auth_context:
        yield auth_context
