from project.database import database
from project.models.db.court import Court
from project.schema import courts
from project.utils.db import fetch_one_parsed_certain
from project.utils.dummy_records import DUMMY_COURT1, DUMMY_COURT2
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_request_with_status,
    send_tournament_request,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import assert_row_count_and_clear, inserted_court


async def test_courts_endpoint(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_court(
        DUMMY_COURT1.model_copy(update={"tournament_id": auth_context.tournament.id})
    ) as court_inserted:
        response = await send_tournament_request(HTTPMethod.GET, "courts", auth_context, {})
        assert len(response["data"]) == 1
        court = response["data"][0]
        assert court["id"] == court_inserted.id
        assert court["name"] == "Court 1"
        assert court["tournament_id"] == auth_context.tournament.id
        assert "display_order" in court


async def test_create_court(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    body = {"name": "Some new name"}
    response = await send_tournament_request(HTTPMethod.POST, "courts", auth_context, json=body)
    assert response["data"]["name"] == body["name"]
    assert response["data"]["tournament_id"] == auth_context.tournament.id
    await assert_row_count_and_clear(courts, 1)


async def test_delete_court(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with inserted_court(
        DUMMY_COURT1.model_copy(update={"tournament_id": auth_context.tournament.id})
    ) as court_inserted:
        assert (
            await send_tournament_request(
                HTTPMethod.DELETE, f"courts/{court_inserted.id}", auth_context
            )
            == SUCCESS_RESPONSE
        )
        await assert_row_count_and_clear(courts, 0)


async def test_update_court(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    body = {"name": "Some new name"}
    async with inserted_court(
        DUMMY_COURT1.model_copy(update={"tournament_id": auth_context.tournament.id})
    ) as court_inserted:
        response = await send_tournament_request(
            HTTPMethod.PUT, f"courts/{court_inserted.id}", auth_context, json=body
        )
        updated_court = await fetch_one_parsed_certain(
            database, Court, query=courts.select().where(courts.c.id == court_inserted.id)
        )
        assert updated_court.name == body["name"]
        assert response["data"]["name"] == body["name"]
        await assert_row_count_and_clear(courts, 1)


async def test_reorder_courts(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_court(
            DUMMY_COURT1.model_copy(
                update={"tournament_id": auth_context.tournament.id, "display_order": 0}
            )
        ) as c1,
        inserted_court(
            DUMMY_COURT2.model_copy(
                update={"tournament_id": auth_context.tournament.id, "display_order": 1}
            )
        ) as c2,
    ):
        response = await send_tournament_request(
            HTTPMethod.PUT,
            "courts/reorder",
            auth_context,
            json={"court_ids": [c2.id, c1.id]},
        )
        assert [row["id"] for row in response["data"]] == [c2.id, c1.id]
        assert [row["display_order"] for row in response["data"]] == [0, 1]

        status, bad = await send_request_with_status(
            HTTPMethod.PUT,
            f"tournaments/{auth_context.tournament.id}/courts/reorder",
            json={"court_ids": [c1.id]},
            headers=auth_context.headers,
        )
        assert status == 400
        assert "exactly once" in str(bad.get("detail", "")).lower()
