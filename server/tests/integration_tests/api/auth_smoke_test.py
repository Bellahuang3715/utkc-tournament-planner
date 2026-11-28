"""Firebase authentication and tournament access tests."""

from uuid import uuid4

from project.utils.dummy_records import DUMMY_PLAYER1, DUMMY_TOURNAMENT
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_auth_request, send_request_with_status
from tests.integration_tests.mocks import get_mock_user
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_player, inserted_tournament, inserted_user


async def test_invalid_token_rejected(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    status, response = await send_request_with_status(
        HTTPMethod.GET,
        "users/me",
        headers={"Authorization": "Bearer some.invalid.token"},
    )
    assert status == 401
    assert response == {"detail": "Invalid or expired ID token"}


async def test_missing_auth_header_rejected(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    status, response = await send_request_with_status(HTTPMethod.GET, "users/me")
    assert status == 401
    assert "authorization" in str(response.get("detail", "")).lower()


async def test_users_me(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_auth_request(HTTPMethod.GET, "users/me", auth_context)
    assert response["data"]["id"] == auth_context.user.id
    assert response["data"]["email"] == auth_context.user.email
    assert response["data"]["name"] == auth_context.user.name


async def test_outsider_denied_tournament_players(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    other = get_mock_user()
    async with inserted_user(other) as other_user:
        async with inserted_tournament(
            DUMMY_TOURNAMENT.model_copy(
                update={
                    "creator_id": other_user.id,
                    "dashboard_endpoint": f"outsider-denied-{uuid4().hex[:8]}",
                    "dashboard_preview_token": f"preview-{uuid4()}",
                }
            )
        ) as other_tournament:
            status, response = await send_request_with_status(
                HTTPMethod.GET,
                f"tournaments/{other_tournament.id}/players",
                headers=auth_context.headers,
            )
            assert status == 403
            assert response == {"detail": "You don't have access to this resource"}


async def test_valid_firebase_token_without_local_account_is_rejected(
    startup_and_shutdown_uvicorn_server: None,
) -> None:
    status, response = await send_request_with_status(
        HTTPMethod.GET,
        "protected",
        headers={"Authorization": f"Bearer test:unregistered-{uuid4()}@example.org"},
    )
    assert (status, response) == (401, {"detail": "User not found"})


async def test_outsider_cannot_delete_another_tournaments_player(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dummy = DUMMY_PLAYER1.model_copy(
        update={"tournament_id": auth_context.tournament.id, "club_id": auth_context.club.id}
    )
    async with inserted_user(get_mock_user()) as outsider, inserted_player(dummy) as player:
        roster = f"tournaments/{auth_context.tournament.id}/players"
        status, _ = await send_request_with_status(
            HTTPMethod.DELETE,
            f"{roster}/{player.id}",
            headers={"Authorization": f"Bearer test:{outsider.email}"},
        )
        assert status == 403
        status, response = await send_request_with_status(
            HTTPMethod.GET, roster, headers=auth_context.headers
        )
        assert status == 200
        assert any(row["id"] == player.id for row in response["data"]["players"])
