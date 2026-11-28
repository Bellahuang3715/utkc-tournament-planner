from uuid import uuid4

from project.models.db.bracket import Bracket, BracketInsertable
from project.schema import brackets
from project.utils.dummy_records import DUMMY_COURT1, DUMMY_TOURNAMENT
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_request_with_status
from tests.integration_tests.mocks import get_mock_user
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    inserted_court,
    inserted_division,
    inserted_generic,
    inserted_tournament,
    inserted_user,
)


async def test_schedule_replacement_is_public_and_rolls_back_on_invalid_reference(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    slug = f"schedule-{uuid4()}"
    async with inserted_tournament(
        DUMMY_TOURNAMENT.model_copy(
            update={
                "creator_id": auth_context.user.id,
                "dashboard_endpoint": slug,
                "dashboard_preview_token": None,
                "dashboard_public": True,
            }
        )
    ) as tournament:
        async with inserted_court(
            DUMMY_COURT1.model_copy(update={"tournament_id": tournament.id})
        ) as court:
            endpoint = f"tournaments/{tournament.id}/schedule_timetable"
            public_endpoint = f"public/tournaments/{slug}/schedule_timetable"
            placement = {
                "id": "draft",
                "court_id": court.id,
                "start_time": "2026-06-01T09:00:00Z",
                "duration_mins": 30,
                "kind": "custom",
                "label": "Warm-up",
                "color": "#228be6",
            }
            custom = {"id": "draft", "label": "Warm-up", "duration_mins": 30}
            status, saved = await send_request_with_status(
                HTTPMethod.PUT,
                endpoint,
                headers=auth_context.headers,
                json={"placements": [placement], "custom_blocks": [custom]},
            )
            assert status == 200
            assert await send_request_with_status(HTTPMethod.GET, public_endpoint) == (200, saved)
            assert saved["data"]["placements"][0]["court_id"] == court.id
            assert saved["data"]["placements"][0]["color"] == "#228be6"
            assert saved["data"]["custom_blocks"][0]["label"] == "Warm-up"

            status, replaced = await send_request_with_status(
                HTTPMethod.PUT,
                endpoint,
                headers=auth_context.headers,
                json={
                    "placements": [{**placement, "label": "Finals"}],
                    "custom_blocks": [],
                },
            )
            assert status == 200
            assert [p["label"] for p in replaced["data"]["placements"]] == ["Finals"]
            assert replaced["data"]["custom_blocks"] == []

            status, error = await send_request_with_status(
                HTTPMethod.PUT,
                endpoint,
                headers=auth_context.headers,
                json={
                    "placements": [placement, {**placement, "court_id": 0}],
                    "custom_blocks": [custom],
                },
            )
            assert status == 400
            assert error == {"detail": "The schedule references a court outside this tournament"}
            assert await send_request_with_status(
                HTTPMethod.GET, endpoint, headers=auth_context.headers
            ) == (200, replaced)
            assert await send_request_with_status(HTTPMethod.GET, public_endpoint) == (
                200,
                replaced,
            )


async def test_schedule_rejects_references_outside_the_tournament(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    tournament_id = auth_context.tournament.id
    endpoint = f"tournaments/{tournament_id}/schedule_timetable"
    async with (
        inserted_user(get_mock_user()) as outsider,
        inserted_tournament(
            DUMMY_TOURNAMENT.model_copy(
                update={
                    "creator_id": outsider.id,
                    "dashboard_endpoint": f"other-schedule-{uuid4()}",
                    "dashboard_preview_token": None,
                }
            )
        ) as other_tournament,
        inserted_court(
            DUMMY_COURT1.model_copy(update={"tournament_id": other_tournament.id})
        ) as other_court,
        inserted_division(tournament_id=other_tournament.id) as other_division,
        inserted_generic(
            BracketInsertable(index=1, division_id=other_division.id, num_players=5),
            brackets,
            Bracket,
        ) as other_bracket,
    ):
        empty = {"placements": [], "custom_blocks": []}
        assert (await send_request_with_status(HTTPMethod.PUT, endpoint, json=empty))[0] == 401
        assert (
            await send_request_with_status(
                HTTPMethod.PUT,
                endpoint,
                headers={"Authorization": f"Bearer test:{outsider.email}"},
                json=empty,
            )
        )[0] == 403

        placement = {
            "id": "draft",
            "court_id": None,
            "start_time": "2026-06-01T09:00:00Z",
            "duration_mins": 30,
            "kind": "custom",
            "label": "Warm-up",
        }
        headers = auth_context.headers
        status, saved = await send_request_with_status(
            HTTPMethod.PUT,
            endpoint,
            headers=headers,
            json={"placements": [placement], "custom_blocks": []},
        )
        assert status == 200
        try:
            for field, value, resource in [
                ("court_id", other_court.id, "court"),
                ("division_id", other_division.id, "division"),
                ("bracket_id", other_bracket.id, "bracket"),
            ]:
                assert await send_request_with_status(
                    HTTPMethod.PUT,
                    endpoint,
                    headers=headers,
                    json={"placements": [{**placement, field: value}], "custom_blocks": []},
                ) == (
                    400,
                    {"detail": f"The schedule references a {resource} outside this tournament"},
                )
                assert await send_request_with_status(
                    HTTPMethod.GET, endpoint, headers=headers
                ) == (
                    200,
                    saved,
                )
            async with (
                inserted_division(
                    tournament_id=tournament_id, name="Scheduled division"
                ) as division,
                inserted_division(
                    tournament_id=tournament_id, name="Different division", prefix=None
                ) as different,
                inserted_generic(
                    BracketInsertable(index=1, division_id=division.id, num_players=5),
                    brackets,
                    Bracket,
                ) as bracket,
            ):
                scheduled = {
                    **placement,
                    "kind": "division",
                    "division_id": division.id,
                    "bracket_id": bracket.id,
                }
                status, saved = await send_request_with_status(
                    HTTPMethod.PUT,
                    endpoint,
                    headers=headers,
                    json={"placements": [scheduled], "custom_blocks": []},
                )
                assert status == 200
                assert saved["data"]["placements"][0]["bracket_id"] == bracket.id
                status, error = await send_request_with_status(
                    HTTPMethod.PUT,
                    endpoint,
                    headers=headers,
                    json={
                        "placements": [{**scheduled, "division_id": different.id}],
                        "custom_blocks": [],
                    },
                )
                assert (status, error) == (
                    400,
                    {"detail": "The schedule bracket does not belong to its selected division"},
                )
                assert await send_request_with_status(
                    HTTPMethod.GET, endpoint, headers=headers
                ) == (
                    200,
                    saved,
                )
        finally:
            await send_request_with_status(HTTPMethod.PUT, endpoint, headers=headers, json=empty)
