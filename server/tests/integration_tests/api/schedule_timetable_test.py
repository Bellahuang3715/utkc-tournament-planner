from uuid import uuid4

from project.utils.dummy_records import DUMMY_COURT1, DUMMY_TOURNAMENT
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import send_request_with_status
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import inserted_court, inserted_tournament


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
            assert error == {"detail": "The schedule references a court that no longer exists"}
            assert await send_request_with_status(
                HTTPMethod.GET, endpoint, headers=auth_context.headers
            ) == (200, replaced)
            assert await send_request_with_status(HTTPMethod.GET, public_endpoint) == (
                200,
                replaced,
            )
