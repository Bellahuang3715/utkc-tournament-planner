from heliclockter import datetime_utc

from project.models.db.round import RoundInsertable
from project.models.db.stage_item import StageItemWithInputsCreate, StageType
from project.models.db.stage_item_inputs import (
    StageItemInputCreateBodyFinal,
)
from project.sql.rounds import sql_create_round
from project.sql.shared import sql_delete_stage_item_with_foreign_keys
from project.sql.stage_items import sql_create_stage_item_with_inputs
from project.utils.dummy_records import (
    DUMMY_COURT1,
    DUMMY_STAGE2,
    DUMMY_STAGE_ITEM1,
    DUMMY_TEAM1,
)
from project.utils.http import HTTPMethod
from tests.integration_tests.api.shared import (
    SUCCESS_RESPONSE,
    send_tournament_request,
)
from tests.integration_tests.mocks import MOCK_NOW
from tests.integration_tests.models import AuthContext
from tests.integration_tests.sql import (
    inserted_court,
    inserted_stage,
    inserted_team,
)


async def test_start_next_round(
    startup_and_shutdown_uvicorn_server: None, auth_context: AuthContext
) -> None:
    async with (
        inserted_court(
            DUMMY_COURT1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ),
        inserted_stage(
            DUMMY_STAGE2.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as stage_inserted_1,
        inserted_team(
            DUMMY_TEAM1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as team_inserted_1,
        inserted_team(
            DUMMY_TEAM1.model_copy(update={"tournament_id": auth_context.tournament.id})
        ) as team_inserted_2,
    ):
        tournament_id = auth_context.tournament.id
        stage_item_1 = await sql_create_stage_item_with_inputs(
            tournament_id,
            StageItemWithInputsCreate(
                stage_id=stage_inserted_1.id,
                name=DUMMY_STAGE_ITEM1.name,
                team_count=2,
                type=StageType.SWISS,
                inputs=[
                    StageItemInputCreateBodyFinal(
                        slot=1,
                        team_id=team_inserted_1.id,
                    ),
                    StageItemInputCreateBodyFinal(
                        slot=2,
                        team_id=team_inserted_2.id,
                    ),
                ],
            ),
        )
        await sql_create_round(
            RoundInsertable(
                stage_item_id=stage_item_1.id,
                name="",
                is_draft=False,
                created=MOCK_NOW,
            ),
        )

        try:
            response = await send_tournament_request(
                HTTPMethod.POST,
                f"stage_items/{stage_item_1.id}/start_next_round",
                auth_context,
                json={},
            )

            assert response == SUCCESS_RESPONSE

            response = await send_tournament_request(
                HTTPMethod.POST,
                f"stage_items/{stage_item_1.id}/start_next_round",
                auth_context,
                json={"adjust_to_time": datetime_utc.now().isoformat()},
            )
            msg = "No more matches to schedule, all combinations of teams have been added already"
            assert response == {"detail": msg}
        finally:
            await sql_delete_stage_item_with_foreign_keys(stage_item_1.id)
