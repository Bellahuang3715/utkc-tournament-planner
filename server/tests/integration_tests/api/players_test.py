from project.schema import players
from project.utils.dummy_records import DUMMY_PLAYER1
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_request_with_status,
    send_tournament_request,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import assert_row_count_and_clear, inserted_player


def _player_insert(auth_context: AuthContext) -> object:
    return DUMMY_PLAYER1.model_copy(
        update={
            "tournament_id": auth_context.tournament.id,
            "club_id": auth_context.club.id,
        }
    )


async def test_players_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_player(_player_insert(auth_context)) as player_inserted:
        response = await send_tournament_request(HTTPMethod.GET, "players", auth_context, {})
        assert response["data"]["count"] == 1
        player = response["data"]["players"][0]
        assert player["id"] == player_inserted.id
        assert player["name"] == player_inserted.name
        assert player["club_id"] == auth_context.club.id
        assert player["tournament_id"] == auth_context.tournament.id


async def test_create_player(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    body = {
        "name": "Some new name",
        "club_id": auth_context.club.id,
        "data": {"name": "Some new name"},
    }
    response = await send_tournament_request(HTTPMethod.POST, "players", auth_context, json=body)
    assert response["success"] is True
    assert isinstance(response["id"], int)
    await assert_row_count_and_clear(players, 1)


async def test_delete_player(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_player(_player_insert(auth_context)) as player_inserted:
        assert (
            await send_tournament_request(
                HTTPMethod.DELETE, f"players/{player_inserted.id}", auth_context
            )
            == SUCCESS_RESPONSE
        )
        await assert_row_count_and_clear(players, 0)


async def test_update_player(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    body = {
        "name": "Some new name",
        "club_id": auth_context.club.id,
        "data": {"name": "Some new name"},
    }
    async with inserted_player(_player_insert(auth_context)) as player_inserted:
        response = await send_tournament_request(
            HTTPMethod.PUT, f"players/{player_inserted.id}", auth_context, json=body
        )
        assert response["data"]["name"] == body["name"]
        assert response["data"]["id"] == player_inserted.id
        await assert_row_count_and_clear(players, 1)


async def test_update_player_codes(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_player(_player_insert(auth_context)) as p1,
        inserted_player(
            DUMMY_PLAYER1.model_copy(
                update={
                    "tournament_id": auth_context.tournament.id,
                    "club_id": auth_context.club.id,
                    "name": "Other Player",
                    "data": {"name": "Other Player"},
                }
            )
        ) as p2,
    ):
        response = await send_tournament_request(
            HTTPMethod.PUT,
            "players/codes",
            auth_context,
            json={
                "codes": [
                    {"player_id": p1.id, "code": "A01"},
                    {"player_id": p2.id, "code": "A02"},
                ]
            },
        )
        assert response == SUCCESS_RESPONSE

        listed = await send_tournament_request(HTTPMethod.GET, "players", auth_context, {})
        by_id = {row["id"]: row for row in listed["data"]["players"]}
        assert by_id[p1.id]["code"] == "A01"
        assert by_id[p2.id]["code"] == "A02"

        status, conflict = await send_request_with_status(
            HTTPMethod.PUT,
            f"tournaments/{auth_context.tournament.id}/players/codes",
            json={
                "codes": [
                    {"player_id": p2.id, "code": "A01"},
                ]
            },
            headers=auth_context.headers,
        )
        assert status == 409
        assert "already in use" in str(conflict.get("detail", "")).lower()
