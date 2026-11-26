"""Soft edit-lock concurrency for scorekeeping groups."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from project.database import database
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


def _five_player_bracket_body(player_ids: list[int]) -> dict:
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


@asynccontextmanager
async def seeded_bracket(
    auth_context: AuthContext,
) -> AsyncIterator[tuple[int, int, int]]:
    """Yield (division_id, bracket_id, first_player_id) for a 5-player group."""
    dummies = [DUMMY_PLAYER1, DUMMY_PLAYER2, DUMMY_PLAYER3, DUMMY_PLAYER4, DUMMY_PLAYER5]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Edit Lock Div",
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
                                json=_five_player_bracket_body([p.id for p in players]),
                                headers=auth_context.headers,
                            )
                            yield division.id, created["data"][0]["id"], p0.id


async def test_edit_lock_claim_conflict_and_release(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with seeded_bracket(auth_context) as (_, bracket_id, _):
        claim_a = await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sess-a", "holder_name": "Alice"},
            headers=auth_context.headers,
        )
        assert claim_a["data"]["holder_session_id"] == "sess-a"
        assert claim_a["data"]["holder_name"] == "Alice"

        status_b, conflict = await send_request_with_status(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sess-b", "holder_name": "Bob"},
            headers=auth_context.headers,
        )
        assert status_b == 409
        detail = conflict["detail"]
        assert detail["message"] == "This group is being edited by someone else"
        assert detail["holder_name"] == "Alice"
        assert detail["holder_session_id"] == "sess-a"

        heartbeat = await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock/heartbeat",
            json={"session_id": "sess-a"},
            headers=auth_context.headers,
        )
        assert heartbeat["data"]["holder_session_id"] == "sess-a"

        release = await send_request(
            HTTPMethod.DELETE,
            f"brackets/{bracket_id}/edit-lock?session_id=sess-a",
            headers=auth_context.headers,
        )
        assert release == SUCCESS_RESPONSE

        claim_b = await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sess-b", "holder_name": "Bob"},
            headers=auth_context.headers,
        )
        assert claim_b["data"]["holder_session_id"] == "sess-b"


async def test_edit_lock_blocks_other_session_writes(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with seeded_bracket(auth_context) as (division_id, bracket_id, player_id):
        await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sess-a", "holder_name": "Alice"},
            headers=auth_context.headers,
        )

        score_body = {
            "brackets": [
                {
                    "bracket_id": bracket_id,
                    "cells": [{"slot_idx": 0, "player_id": player_id, "score": "M"}],
                }
            ]
        }

        headers_a = {**auth_context.headers, "X-Edit-Session-Id": "sess-a"}
        ok = await send_request(
            HTTPMethod.PUT,
            f"divisions/{division_id}/bracket-cells",
            json=score_body,
            headers=headers_a,
        )
        assert ok == SUCCESS_RESPONSE

        headers_b = {**auth_context.headers, "X-Edit-Session-Id": "sess-b"}
        status_b, blocked = await send_request_with_status(
            HTTPMethod.PUT,
            f"divisions/{division_id}/bracket-cells",
            json=score_body,
            headers=headers_b,
        )
        assert status_b == 409
        assert blocked["detail"]["holder_name"] == "Alice"


async def test_edit_lock_expires_after_ttl(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with seeded_bracket(auth_context) as (_, bracket_id, _):
        await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sess-a", "holder_name": "Alice"},
            headers=auth_context.headers,
        )

        await database.execute(
            """
            UPDATE bracket_edit_locks
            SET updated_at = NOW() - make_interval(secs => 60)
            WHERE bracket_id = :bracket_id
            """,
            {"bracket_id": bracket_id},
        )

        claim_b = await send_request(
            HTTPMethod.POST,
            f"brackets/{bracket_id}/edit-lock",
            json={"session_id": "sess-b", "holder_name": "Bob"},
            headers=auth_context.headers,
        )
        assert claim_b["data"]["holder_session_id"] == "sess-b"
        assert claim_b["data"]["holder_name"] == "Bob"
