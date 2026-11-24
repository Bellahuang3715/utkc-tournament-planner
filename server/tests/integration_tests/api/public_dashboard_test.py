from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_request, send_request_with_status
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_division


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
