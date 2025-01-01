from fastapi import APIRouter, Depends

from project.logic.ranking.calculation import recalculate_ranking_for_stage_item
from project.logic.ranking.elimination import (
    update_inputs_in_complete_elimination_stage_item,
)
from project.logic.subscriptions import check_requirement
from project.models.db.ranking import RankingBody, RankingCreateBody
from project.models.db.stage_item import StageType
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import (
    RankingsResponse,
    SuccessResponse,
)
from project.sql.rankings import (
    get_all_rankings_in_tournament,
    sql_create_ranking,
    sql_delete_ranking,
    sql_update_ranking,
)
from project.sql.stage_item_inputs import get_stage_item_input_ids_by_ranking_id
from project.sql.stage_items import get_stage_item
from project.utils.id_types import RankingId, TournamentId

router = APIRouter()


@router.get("/tournaments/{tournament_id}/rankings")
async def get_rankings(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> RankingsResponse:
    return RankingsResponse(data=await get_all_rankings_in_tournament(tournament_id))


@router.put("/tournaments/{tournament_id}/rankings/{ranking_id}")
async def update_ranking_by_id(
    tournament_id: TournamentId,
    ranking_id: RankingId,
    ranking_body: RankingBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_update_ranking(
        tournament_id=tournament_id,
        ranking_id=ranking_id,
        ranking_body=ranking_body,
    )
    stage_item_ids = await get_stage_item_input_ids_by_ranking_id(ranking_id)
    for stage_item_id in stage_item_ids:
        stage_item = await get_stage_item(tournament_id, stage_item_id)
        await recalculate_ranking_for_stage_item(tournament_id, stage_item)

        if stage_item.type == StageType.SINGLE_ELIMINATION:
            await update_inputs_in_complete_elimination_stage_item(stage_item)
    return SuccessResponse()


@router.delete("/tournaments/{tournament_id}/rankings/{ranking_id}")
async def delete_ranking(
    tournament_id: TournamentId,
    ranking_id: RankingId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_delete_ranking(tournament_id, ranking_id)
    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/rankings")
async def create_ranking(
    ranking_body: RankingCreateBody,
    tournament_id: TournamentId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    existing_rankings = await get_all_rankings_in_tournament(tournament_id)
    check_requirement(existing_rankings, user, "max_rankings")

    highest_position = (
        max(x.position for x in existing_rankings) if len(existing_rankings) > 0 else -1
    )
    await sql_create_ranking(tournament_id, ranking_body, highest_position + 1)
    return SuccessResponse()
