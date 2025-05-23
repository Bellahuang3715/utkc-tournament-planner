from project.models.db.stage_item_inputs import StageItemInputInsertable
from project.utils.dummy_records import (
    DUMMY_STAGE1,
    DUMMY_STAGE_ITEM1,
    DUMMY_TEAM1,
)
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    send_tournament_request,
)
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    inserted_stage,
    inserted_stage_item,
    inserted_stage_item_input,
    inserted_team,
)


async def test_available_inputs(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_team(
            DUMMY_TEAM1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as team_inserted,
        inserted_stage(
            DUMMY_STAGE1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as stage_inserted_1,
        inserted_stage_item(
            DUMMY_STAGE_ITEM1.model_copy(
                update={"stage_id": stage_inserted_1.id, "ranking_id": auth_context.ranking.id}
            )
        ),
    ):
        response = await send_tournament_request(HTTPMethod.GET, "available_inputs", auth_context)

    assert response == {
        "data": {str(stage_inserted_1.id): [{"team_id": team_inserted.id, "already_taken": False}]}
    }


async def test_update_stage_item_input(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_team(
            DUMMY_TEAM1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as team_inserted,
        inserted_stage(
            DUMMY_STAGE1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as stage_inserted_1,
        inserted_stage_item(
            DUMMY_STAGE_ITEM1.model_copy(
                update={"stage_id": stage_inserted_1.id, "ranking_id": auth_context.ranking.id}
            )
        ) as stage_item_inserted,
        inserted_stage_item_input(
            StageItemInputInsertable(
                slot=0,
                team_id=None,
                tournament_id=auth_context.tournament.id,
                stage_item_id=stage_item_inserted.id,
            )
        ) as stage_item_input1_inserted,
    ):
        response = await send_tournament_request(
            HTTPMethod.PUT,
            f"stage_items/{stage_item_inserted.id}/inputs/{stage_item_input1_inserted.id}",
            auth_context,
            json={"team_id": team_inserted.id},
        )

    assert response == {"success": True}


async def test_update_stage_item_input_invalid_team(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_stage(
            DUMMY_STAGE1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as stage_inserted_1,
        inserted_stage_item(
            DUMMY_STAGE_ITEM1.model_copy(
                update={"stage_id": stage_inserted_1.id, "ranking_id": auth_context.ranking.id}
            )
        ) as stage_item_inserted,
        inserted_stage_item_input(
            StageItemInputInsertable(
                slot=0,
                team_id=None,
                tournament_id=auth_context.tournament.id,
                stage_item_id=stage_item_inserted.id,
            )
        ) as stage_item_input1_inserted,
    ):
        response = await send_tournament_request(
            HTTPMethod.PUT,
            f"stage_items/{stage_item_inserted.id}/inputs/{stage_item_input1_inserted.id}",
            auth_context,
            json={"team_id": -42},
        )

    assert response == {"detail": "Could not find team with id -42"}
