from project.sql.clubs import get_clubs_for_user_id, sql_delete_club
from project.utils.dummy_records import DUMMY_CLUB, DUMMY_MOCK_TIME, DUMMY_PLAYER1
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_auth_request
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_club, inserted_player


async def test_clubs_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_auth_request(HTTPMethod.GET, "clubs", auth_context, {})
    assert response["data"][0]["id"] == auth_context.club.id
    assert response["data"][0]["name"] == "Some Cool Club"
    assert response["data"][0]["created"] == DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z")


async def test_create_club(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    payload = {
        "name": "Another Club",
        "abbreviation": "AC",
        "country": "Canada",
    }
    response = await send_auth_request(HTTPMethod.POST, "clubs", auth_context, json=payload)
    user_id = auth_context.user.id
    club_id = response["data"]["id"]

    clubs = await get_clubs_for_user_id(user_id)
    await sql_delete_club(club_id)

    assert len(clubs) == 2
    assert response["data"]["name"] == payload["name"]


async def test_delete_club(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_club(
        DUMMY_CLUB.model_copy(
            update={
                "name": "Empty Club",
                "abbreviation": "EC",
                "creator_id": auth_context.user.id,
            }
        )
    ) as club_inserted:
        response = await send_auth_request(
            HTTPMethod.DELETE, f"clubs/{club_inserted.id}", auth_context
        )
        assert response["success"] is True


async def test_delete_club_blocked_when_used(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_player(
        DUMMY_PLAYER1.model_copy(
            update={
                "tournament_id": auth_context.tournament.id,
                "club_id": auth_context.club.id,
            }
        )
    ):
        response = await send_auth_request(
            HTTPMethod.DELETE, f"clubs/{auth_context.club.id}", auth_context
        )
        assert "detail" in response
        assert "Can't delete" in response["detail"]
        assert auth_context.tournament.name in response["detail"]
        assert "1 player" in response["detail"]
