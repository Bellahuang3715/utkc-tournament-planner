"""Serve the Playwright tournament fixture on a dedicated CI database."""

import asyncio
import signal
from contextlib import AsyncExitStack
from os import getenv
from unittest.mock import patch

import uvicorn

from project.app import app
from project.config import Environment, environment
from project.database import database, engine
from project.models.db.bracket import (
    BracketWithPlayersCreate,
    DivisionBracketsCreateBody,
    PlayerSlotCreate,
)
from project.schema import metadata
from project.sql.brackets import sql_create_division_brackets
from project.utils.dummy_records import (
    DUMMY_CLUB,
    DUMMY_COURT1,
    DUMMY_PLAYER1,
    DUMMY_PLAYER2,
    DUMMY_PLAYER3,
    DUMMY_PLAYER4,
    DUMMY_PLAYER5,
    DUMMY_TOURNAMENT,
)
from tests.integration_tests.conftest import assert_safe_to_reinit_database
from tests.integration_tests.mocks import get_mock_user
from tests.integration_tests.sql import (
    attach_player_to_division,
    inserted_club,
    inserted_court,
    inserted_division,
    inserted_player,
    inserted_tournament,
    inserted_user,
)

ORGANIZER_EMAIL = "playwright-organizer@example.org"


def verify_organizer_token(token: str) -> dict[str, str]:
    if token != f"test:{ORGANIZER_EMAIL}":
        raise ValueError("Invalid Playwright organizer token")
    return {"email": ORGANIZER_EMAIL, "name": "Playwright Organizer"}


async def main() -> None:
    if environment is not Environment.CI:
        raise RuntimeError("The Playwright fixture requires ENVIRONMENT=CI")
    assert_safe_to_reinit_database()
    metadata.create_all(engine)

    async with (
        database,
        inserted_user(get_mock_user().model_copy(update={"email": ORGANIZER_EMAIL})) as owner,
        inserted_club(DUMMY_CLUB.model_copy(update={"creator_id": owner.id})) as club,
        inserted_tournament(
            DUMMY_TOURNAMENT.model_copy(
                update={
                    "name": "Playwright Tournament",
                    "creator_id": owner.id,
                    "dashboard_endpoint": "playwright-scorekeeping",
                    "dashboard_preview_token": None,
                    "scorekeeper_token": "playwright-scorekeeper",
                }
            )
        ) as tournament,
        inserted_court(DUMMY_COURT1.model_copy(update={"tournament_id": tournament.id})),
        inserted_division(
            tournament_id=tournament.id,
            name="Playwright Individuals",
            prefix=None,
        ) as division,
        AsyncExitStack() as stack,
    ):
        slots = []
        for index, dummy in enumerate(
            [DUMMY_PLAYER1, DUMMY_PLAYER2, DUMMY_PLAYER3, DUMMY_PLAYER4, DUMMY_PLAYER5]
        ):
            player = await stack.enter_async_context(
                inserted_player(
                    dummy.model_copy(update={"tournament_id": tournament.id, "club_id": club.id})
                )
            )
            await attach_player_to_division(player.id, division.id)
            slots.append(PlayerSlotCreate(player_id=player.id, bracket_idx=index))
        await sql_create_division_brackets(
            division.id,
            DivisionBracketsCreateBody(
                brackets=[
                    BracketWithPlayersCreate(
                        index=1, num_players=len(slots), title="Group 1", players=slots
                    )
                ]
            ),
        )

        port = int(getenv("E2E_API_PORT", "8400"))
        server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port))
        loop = asyncio.get_running_loop()
        # Uvicorn replays exit signals to the previous handlers after server shutdown.
        # Let the fixture contexts finish removing their data before leaving the process.
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, server.handle_exit, sig, None)
        try:
            with patch(
                "project.routes.auth.auth.verify_id_token", side_effect=verify_organizer_token
            ):
                await server.serve()
        finally:
            for sig in (signal.SIGINT, signal.SIGTERM):
                loop.remove_signal_handler(sig)


if __name__ == "__main__":
    asyncio.run(main())
