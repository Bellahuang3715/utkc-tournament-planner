from project.utils.dummy_records import (
    DUMMY_PLAYER1,
    DUMMY_PLAYER2,
    DUMMY_PLAYER3,
    DUMMY_PLAYER4,
    DUMMY_PLAYER5,
)
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
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


async def test_public_list_divisions(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    endpoint = auth_context.tournament.dashboard_endpoint
    assert endpoint

    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Public Div",
        prefix=None,
    ) as division:
        response = await send_request(
            HTTPMethod.GET,
            f"public/tournaments/{endpoint}/divisions",
        )
        assert "data" in response
        assert any(row["id"] == division.id for row in response["data"])


async def test_public_players_readable_without_auth(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    endpoint = auth_context.tournament.dashboard_endpoint
    response = await send_request(
        HTTPMethod.GET,
        f"public/tournaments/{endpoint}/players",
    )
    assert "data" in response
    assert "players" in response["data"]


async def test_public_cannot_mutate_divisions(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    """Organizer write endpoints still require auth (public prefix is read-only)."""
    status, response = await send_request_with_status(
        HTTPMethod.POST,
        "divisions",
        json={
            "name": "Hacker Div",
            "tournament_id": auth_context.tournament.id,
            "duration_mins": 5,
            "margin_mins": 1,
            "division_type": "INDIVIDUALS",
        },
    )
    assert status in (401, 403)
    assert "detail" in response


async def test_public_brackets_and_cells_readable_without_auth(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    endpoint = auth_context.tournament.dashboard_endpoint
    assert endpoint
    dummies = [
        DUMMY_PLAYER1,
        DUMMY_PLAYER2,
        DUMMY_PLAYER3,
        DUMMY_PLAYER4,
        DUMMY_PLAYER5,
    ]
    async with inserted_division(
        tournament_id=auth_context.tournament.id,
        name="Public Bracket Div",
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

                            create_res = await send_request(
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
                            bracket_id = create_res["data"][0]["id"]

                            await send_request(
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
                                                    "score": "M",
                                                }
                                            ],
                                        }
                                    ]
                                },
                                headers=auth_context.headers,
                            )

                            public_brackets = await send_request(
                                HTTPMethod.GET,
                                f"public/tournaments/{endpoint}/divisions/{division.id}/brackets",
                            )
                            assert any(b["id"] == bracket_id for b in public_brackets["data"])

                            public_cells = await send_request(
                                HTTPMethod.GET,
                                (
                                    f"public/tournaments/{endpoint}/divisions/"
                                    f"{division.id}/bracket-cells"
                                ),
                            )
                            assert any(
                                cell.get("bracket_id") == bracket_id
                                and (cell.get("score") or "").strip() == "M"
                                for cell in public_cells["data"]
                            )

                            # Mutate still requires auth (no public write path).
                            status, _ = await send_request_with_status(
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
                                                    "score": "K",
                                                }
                                            ],
                                        }
                                    ]
                                },
                            )
                            assert status in (401, 403)


async def test_public_match_directory_readable_without_auth(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    endpoint = auth_context.tournament.dashboard_endpoint
    assert endpoint

    async with (
        inserted_division(
            tournament_id=auth_context.tournament.id,
            name="Directory Div",
            prefix=None,
        ) as division,
        inserted_player(_player(auth_context, DUMMY_PLAYER1)) as player,
    ):
        await attach_player_to_division(player.id, division.id)

        response = await send_request(
            HTTPMethod.GET,
            f"public/tournaments/{endpoint}/match-directory",
        )
        assert "data" in response
        assert any(
            row["player_id"] == player.id and row["division_id"] == division.id
            for row in response["data"]
        )


async def test_public_schedule_timetable_readable_without_auth(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    endpoint = auth_context.tournament.dashboard_endpoint
    assert endpoint

    response = await send_request(
        HTTPMethod.GET,
        f"public/tournaments/{endpoint}/schedule_timetable",
    )
    assert "data" in response
    assert "placements" in response["data"]
    assert "custom_blocks" in response["data"]
    assert isinstance(response["data"]["placements"], list)
    assert isinstance(response["data"]["custom_blocks"], list)
