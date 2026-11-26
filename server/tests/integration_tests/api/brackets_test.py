from project.utils.dummy_records import (
    DUMMY_PLAYER1,
    DUMMY_PLAYER2,
    DUMMY_PLAYER3,
    DUMMY_PLAYER4,
    DUMMY_PLAYER5,
    DUMMY_PLAYER6,
)
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_request,
    send_request_with_status,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    attach_player_to_division,
    inserted_division,
    inserted_player,
)


def _player(auth_context: AuthContext, dummy: object) -> object:
    return dummy.model_copy(  # type: ignore[attr-defined]
        update={
            "tournament_id": auth_context.tournament.id,
            "club_id": auth_context.club.id,
        }
    )


def _five_player_bracket_body(player_ids: list[int]) -> dict:
    assert len(player_ids) == 5
    return {
        "brackets": [
            {
                "index": 1,
                "num_players": 5,
                "title": "Group 1",
                "players": [
                    {"player_id": pid, "bracket_idx": i} for i, pid in enumerate(player_ids)
                ],
            }
        ]
    }


async def test_create_brackets_rejects_under_min_size(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Tiny Div",
        prefix=None,
    ) as division:
        async with inserted_player(_player(auth_context, DUMMY_PLAYER1)) as p1:
            status, response = await send_request_with_status(
                HTTPMethod.POST,
                f"divisions/{division.id}/brackets",
                json={
                    "brackets": [
                        {
                            "index": 1,
                            "num_players": 4,
                            "players": [{"player_id": p1.id, "bracket_idx": i} for i in range(4)],
                        }
                    ]
                },
                headers=auth_context.headers,
            )
            assert status == 400
            assert "at least 5" in str(response.get("detail", "")).lower()


async def test_create_brackets_valid_size(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dummies = [
        DUMMY_PLAYER1,
        DUMMY_PLAYER2,
        DUMMY_PLAYER3,
        DUMMY_PLAYER4,
        DUMMY_PLAYER5,
    ]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Valid Div",
        prefix=None,
    ) as division:
        players = []
        # Nested context managers for 5 players
        async with inserted_player(_player(auth_context, dummies[0])) as p0:
            async with inserted_player(_player(auth_context, dummies[1])) as p1:
                async with inserted_player(_player(auth_context, dummies[2])) as p2:
                    async with inserted_player(_player(auth_context, dummies[3])) as p3:
                        async with inserted_player(_player(auth_context, dummies[4])) as p4:
                            players = [p0, p1, p2, p3, p4]
                            for p in players:
                                await attach_player_to_division(p.id, division.id)

                            response = await send_request(
                                HTTPMethod.POST,
                                f"divisions/{division.id}/brackets",
                                json=_five_player_bracket_body([p.id for p in players]),
                                headers=auth_context.headers,
                            )
                            assert "data" in response
                            assert len(response["data"]) == 1
                            assert response["data"][0]["num_players"] == 5


async def test_division_locks_after_score_and_blocks_attach(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dummies = [
        DUMMY_PLAYER1,
        DUMMY_PLAYER2,
        DUMMY_PLAYER3,
        DUMMY_PLAYER4,
        DUMMY_PLAYER5,
    ]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Lock Div",
        prefix=None,
    ) as division:
        async with inserted_player(_player(auth_context, dummies[0])) as p0:
            async with inserted_player(_player(auth_context, dummies[1])) as p1:
                async with inserted_player(_player(auth_context, dummies[2])) as p2:
                    async with inserted_player(_player(auth_context, dummies[3])) as p3:
                        async with inserted_player(_player(auth_context, dummies[4])) as p4:
                            async with inserted_player(
                                _player(auth_context, DUMMY_PLAYER6)
                            ) as extra:
                                players = [p0, p1, p2, p3, p4]
                                for p in players:
                                    await attach_player_to_division(p.id, division.id)

                                create_res = await send_request(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/brackets",
                                    json=_five_player_bracket_body([p.id for p in players]),
                                    headers=auth_context.headers,
                                )
                                bracket_id = create_res["data"][0]["id"]

                                # Enter a score → locks the division.
                                score_res = await send_request(
                                    HTTPMethod.PUT,
                                    f"divisions/{division.id}/bracket-cells",
                                    json={
                                        "brackets": [
                                            {
                                                "bracket_id": bracket_id,
                                                "cells": [
                                                    {
                                                        "slot_idx": 0,
                                                        "player_id": p0.id,
                                                        "score": "3",
                                                    }
                                                ],
                                            }
                                        ]
                                    },
                                    headers=auth_context.headers,
                                )
                                assert score_res == SUCCESS_RESPONSE

                                lock_res = await send_request(
                                    HTTPMethod.GET,
                                    f"divisions/{division.id}/lock",
                                    headers=auth_context.headers,
                                )
                                assert lock_res["data"]["locked"] is True

                                status, response = await send_request_with_status(
                                    HTTPMethod.POST,
                                    f"divisions/{division.id}/players",
                                    json={"player_ids": [extra.id]},
                                    headers=auth_context.headers,
                                )
                                assert status == 409
                                assert (
                                    "scorekeeping has started"
                                    in str(response.get("detail", "")).lower()
                                )
