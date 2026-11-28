import io
from uuid import uuid4

import aiofiles.os
import aiohttp

from project.database import database
from project.logic.tournaments import sql_delete_tournament_completely
from project.models.db.tournament import Tournament
from project.routes.tournaments import MAX_LOGO_BYTES
from project.schema import tournaments
from project.sql.tournaments import sql_get_tournament_by_endpoint_name
from project.utils.db import fetch_one_parsed_certain
from project.utils.dummy_records import DUMMY_MOCK_TIME, DUMMY_TOURNAMENT
from project.utils.http import HTTPMethod
from project.utils.types import assert_some
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_auth_request,
    send_request_with_status,
    send_tournament_request,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_tournament


def _extra_tournament(auth_context: AuthContext, *, endpoint: str) -> object:
    return DUMMY_TOURNAMENT.model_copy(
        update={
            "creator_id": auth_context.user.id,
            "dashboard_endpoint": endpoint,
            "dashboard_preview_token": f"preview-{uuid4()}",
        }
    )


async def test_tournaments_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_auth_request(HTTPMethod.GET, "tournaments", auth_context, {})
    assert len(response["data"]) >= 1
    match = next(t for t in response["data"] if t["id"] == auth_context.tournament.id)
    assert match["name"] == auth_context.tournament.name
    assert match["dashboard_endpoint"] == auth_context.tournament.dashboard_endpoint
    assert match["creator_id"] == auth_context.user.id


async def test_tournament_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    response = await send_auth_request(
        HTTPMethod.GET, f"tournaments/{auth_context.tournament.id}", auth_context, {}
    )
    assert response["data"]["id"] == auth_context.tournament.id
    assert response["data"]["name"] == auth_context.tournament.name
    assert response["data"]["my_role"] == "organizer"


async def test_create_tournament(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    dashboard_endpoint = "some-new-endpoint"
    body = {
        "name": "Some new name",
        "organizer": "UofT",
        "start_time": DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z"),
        "dashboard_public": True,
        "dashboard_endpoint": dashboard_endpoint,
        "auto_assign_courts": True,
    }
    assert (
        await send_auth_request(HTTPMethod.POST, "tournaments", auth_context, json=body)
        == SUCCESS_RESPONSE
    )

    tournament = assert_some(await sql_get_tournament_by_endpoint_name(dashboard_endpoint))
    assert tournament.creator_id == auth_context.user.id
    await sql_delete_tournament_completely(tournament.id)


async def test_create_tournament_duplicate_dashboard_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    body = {
        "name": "Some new name",
        "organizer": "UofT",
        "start_time": DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z"),
        "dashboard_public": True,
        "dashboard_endpoint": auth_context.tournament.dashboard_endpoint,
        "auto_assign_courts": True,
    }
    status, response = await send_request_with_status(
        HTTPMethod.POST,
        "tournaments",
        json=body,
        headers=auth_context.headers,
    )
    assert status == 400
    assert response == {"detail": "This dashboard link is already taken"}


async def test_update_tournament(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    original = auth_context.tournament
    body = {
        "name": "Some new name",
        "start_time": DUMMY_MOCK_TIME.isoformat().replace("+00:00", "Z"),
        "dashboard_public": False,
        "dashboard_endpoint": original.dashboard_endpoint,
        "auto_assign_courts": True,
    }
    assert (
        await send_tournament_request(HTTPMethod.PUT, "", auth_context, json=body)
        == SUCCESS_RESPONSE
    )
    updated_tournament = await fetch_one_parsed_certain(
        database,
        Tournament,
        query=tournaments.select().where(tournaments.c.id == auth_context.tournament.id),
    )
    assert updated_tournament.name == body["name"]
    assert updated_tournament.dashboard_public == body["dashboard_public"]

    # Restore shared session fixture tournament for later tests.
    restore = {
        "name": original.name,
        "start_time": original.start_time.isoformat().replace("+00:00", "Z"),
        "dashboard_public": original.dashboard_public,
        "dashboard_endpoint": original.dashboard_endpoint,
        "auto_assign_courts": original.auto_assign_courts,
    }
    assert (
        await send_tournament_request(HTTPMethod.PUT, "", auth_context, json=restore)
        == SUCCESS_RESPONSE
    )


async def test_delete_tournament(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_tournament(
        _extra_tournament(auth_context, endpoint="to-delete-endpoint")
    ) as tournament_inserted:
        assert (
            await send_tournament_request(
                HTTPMethod.DELETE,
                "",
                auth_context.model_copy(update={"tournament": tournament_inserted}),
            )
            == SUCCESS_RESPONSE
        )


async def test_tournament_upload_and_remove_logo(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    # Minimal 1x1 PNG
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    data = aiohttp.FormData()
    data.add_field(
        "file",
        io.BytesIO(png_bytes),
        filename="test_logo.png",
        content_type="image/png",
    )

    response = await send_tournament_request(
        method=HTTPMethod.POST,
        endpoint="logo",
        auth_context=auth_context,
        body=data,
    )

    logo_path = response["data"]["logo_path"]
    assert logo_path, f"Response: {response}"
    assert await aiofiles.os.path.exists(f"static/tournament-logos/{logo_path}")

    for filename, content, expected_status in [
        ("logo.txt", b"not an image", 415),
        ("logo.png", b"not an image", 415),
        ("logo.png", png_bytes.ljust(MAX_LOGO_BYTES + 1, b"\0"), 413),
    ]:
        invalid_file = aiohttp.FormData()
        invalid_file.add_field("file", io.BytesIO(content), filename=filename)
        status, _ = await send_request_with_status(
            HTTPMethod.POST,
            f"tournaments/{auth_context.tournament.id}/logo",
            headers=auth_context.headers,
            body=invalid_file,
        )
        assert status == expected_status
        status, unchanged = await send_request_with_status(
            HTTPMethod.GET,
            f"tournaments/{auth_context.tournament.id}",
            headers=auth_context.headers,
        )
        assert status == 200
        assert unchanged["data"]["logo_path"] == logo_path
        assert await aiofiles.os.path.exists(f"static/tournament-logos/{logo_path}")

    response = await send_tournament_request(
        method=HTTPMethod.POST, endpoint="logo", auth_context=auth_context, body=aiohttp.FormData()
    )

    assert response["data"]["logo_path"] is None, f"Response: {response}"
    assert not await aiofiles.os.path.exists(f"static/tournament-logos/{logo_path}")
