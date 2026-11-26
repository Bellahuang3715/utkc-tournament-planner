"""Scorekeeper redeem + scoring via X-Scorekeeper-Token."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from project.utils.dummy_records import (
    DUMMY_PLAYER1,
    DUMMY_PLAYER2,
    DUMMY_PLAYER3,
    DUMMY_PLAYER4,
    DUMMY_PLAYER5,
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


@asynccontextmanager
async def seeded_bracket(
    auth_context: AuthContext,
) -> AsyncIterator[tuple[int, int, int]]:
    dummies = [DUMMY_PLAYER1, DUMMY_PLAYER2, DUMMY_PLAYER3, DUMMY_PLAYER4, DUMMY_PLAYER5]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Scorekeeper Div",
        prefix=None,
    ) as division:
        async with inserted_player(_player(auth_context, dummies[0])) as p0:
            async with inserted_player(_player(auth_context, dummies[1])) as p1:
                async with inserted_player(_player(auth_context, dummies[2])) as p2:
                    async with inserted_player(_player(auth_context, dummies[3])) as p3:
                        async with inserted_player(_player(auth_context, dummies[4])) as p4:
                            players = [p0, p1, p2, p3, p4]
                            for p in players:
                                await attach_player_to_division(p.id, division.id)
                            created = await send_request(
                                HTTPMethod.POST,
                                f"divisions/{division.id}/brackets",
                                json={
                                    "brackets": [
                                        {
                                            "index": 1,
                                            "num_players": 5,
                                            "title": "Group 1",
                                            "players": [
                                                {"player_id": p.id, "bracket_idx": i}
                                                for i, p in enumerate(players)
                                            ],
                                        }
                                    ]
                                },
                                headers=auth_context.headers,
                            )
                            yield division.id, created["data"][0]["id"], p0.id


async def test_redeem_scorekeeper_token_valid_and_invalid(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    rotate = await send_request(
        HTTPMethod.POST,
        f"tournaments/{auth_context.tournament.id}/scorekeeper-token",
        headers=auth_context.headers,
    )
    token = rotate["scorekeeper_token"]
    assert token

    redeemed = await send_request(
        HTTPMethod.POST,
        "scorekeeping/redeem",
        json={"token": token},
    )
    assert redeemed["data"]["tournament_id"] == auth_context.tournament.id
    assert redeemed["data"]["name"] == auth_context.tournament.name
    assert redeemed["data"]["role"] == "scorekeeper"

    status_bad, bad = await send_request_with_status(
        HTTPMethod.POST,
        "scorekeeping/redeem",
        json={"token": "not-a-real-code"},
    )
    assert status_bad == 404
    assert bad == {"detail": "Invalid scorekeeper access code"}

    status_empty, empty = await send_request_with_status(
        HTTPMethod.POST,
        "scorekeeping/redeem",
        json={"token": "   "},
    )
    assert status_empty == 400
    assert empty == {"detail": "Access code is required"}


async def test_scorekeeper_can_write_scores_with_token(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    rotate = await send_request(
        HTTPMethod.POST,
        f"tournaments/{auth_context.tournament.id}/scorekeeper-token",
        headers=auth_context.headers,
    )
    token = rotate["scorekeeper_token"]

    async with seeded_bracket(auth_context) as (division_id, bracket_id, player_id):
        # No Firebase auth — only scorekeeper token.
        sk_headers = {"X-Scorekeeper-Token": token, "X-Edit-Session-Id": "sk-sess-1"}

        claim = await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sk-sess-1", "holder_name": "Scorekeeper"},
            headers=sk_headers,
        )
        assert claim["data"]["holder_session_id"] == "sk-sess-1"

        score = await send_request(
            HTTPMethod.PUT,
            f"divisions/{division_id}/bracket-cells",
            json={
                "brackets": [
                    {
                        "bracket_id": bracket_id,
                        "cells": [{"slot_idx": 0, "player_id": player_id, "score": "K"}],
                    }
                ]
            },
            headers=sk_headers,
        )
        assert score == SUCCESS_RESPONSE

        lock = await send_request(
            HTTPMethod.GET,
            f"divisions/{division_id}/lock",
            headers=sk_headers,
        )
        assert lock["data"]["locked"] is True


async def test_scorekeeper_token_clear_blocks_access(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    rotate = await send_request(
        HTTPMethod.POST,
        f"tournaments/{auth_context.tournament.id}/scorekeeper-token",
        headers=auth_context.headers,
    )
    token = rotate["scorekeeper_token"]

    clear = await send_request(
        HTTPMethod.DELETE,
        f"tournaments/{auth_context.tournament.id}/scorekeeper-token",
        headers=auth_context.headers,
    )
    assert clear == SUCCESS_RESPONSE

    status, response = await send_request_with_status(
        HTTPMethod.POST,
        "scorekeeping/redeem",
        json={"token": token},
    )
    assert status == 404
    assert response == {"detail": "Invalid scorekeeper access code"}
