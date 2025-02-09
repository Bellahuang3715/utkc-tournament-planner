from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc
from starlette import status

from project.database import database
from project.logic.planning.conflicts import handle_conflicts
from project.logic.planning.matches import update_start_times_of_matches
from project.logic.planning.rounds import (
    MatchTimingAdjustmentInfeasible,
    get_draft_round,
    schedule_all_matches_for_swiss_round,
)
from project.logic.ranking.calculation import recalculate_ranking_for_stage_item
from project.logic.ranking.elimination import (
    update_inputs_in_complete_elimination_stage_item,
)
from project.logic.scheduling.builder import (
    build_matches_for_stage_item,
)
from project.logic.scheduling.upcoming_matches import get_upcoming_matches_for_swiss
from project.logic.subscriptions import check_requirement
from project.models.db.match import MatchCreateBody, MatchFilter, SuggestedMatch
from project.models.db.round import RoundInsertable
from project.models.db.stage_item import (
    StageItemActivateNextBody,
    StageItemCreateBody,
    StageItemUpdateBody,
    StageType,
)
from project.models.db.user import UserPublic
from project.models.db.util import StageItemWithRounds
from project.routes.auth import firebase_user_authenticated
from project.routes.models import SuccessResponse
from project.routes.util import stage_item_dependency
from project.sql.courts import get_all_courts_in_tournament
from project.sql.matches import sql_create_match
from project.sql.rounds import (
    get_next_round_name,
    get_round_by_id,
    set_round_active_or_draft,
    sql_create_round,
)
from project.sql.shared import sql_delete_stage_item_with_foreign_keys
from project.sql.stage_items import (
    get_stage_item,
    sql_create_stage_item_with_empty_inputs,
)
from project.sql.stages import get_full_tournament_details
from project.sql.tournaments import sql_get_tournament
from project.sql.validation import check_foreign_keys_belong_to_tournament
from project.utils.errors import (
    ForeignKey,
    check_foreign_key_violation,
)
from project.utils.id_types import StageItemId, TournamentId

router = APIRouter()


@router.delete(
    "/tournaments/{tournament_id}/stage_items/{stage_item_id}", response_model=SuccessResponse
)
async def delete_stage_item(
    tournament_id: TournamentId,
    stage_item_id: StageItemId,
    _: UserPublic = Depends(firebase_user_authenticated),
    __: StageItemWithRounds = Depends(stage_item_dependency),
) -> SuccessResponse:
    with check_foreign_key_violation(
        {ForeignKey.matches_stage_item_input1_id_fkey, ForeignKey.matches_stage_item_input2_id_fkey}
    ):
        await sql_delete_stage_item_with_foreign_keys(stage_item_id)
    await update_start_times_of_matches(tournament_id)
    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/stage_items", response_model=SuccessResponse)
async def create_stage_item(
    tournament_id: TournamentId,
    stage_body: StageItemCreateBody,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await check_foreign_keys_belong_to_tournament(stage_body, tournament_id)

    stages = await get_full_tournament_details(tournament_id)
    existing_stage_items = [stage_item for stage in stages for stage_item in stage.stage_items]
    check_requirement(existing_stage_items, user, "max_stage_items")

    stage_item = await sql_create_stage_item_with_empty_inputs(tournament_id, stage_body)
    await build_matches_for_stage_item(stage_item, tournament_id)
    return SuccessResponse()


@router.put(
    "/tournaments/{tournament_id}/stage_items/{stage_item_id}", response_model=SuccessResponse
)
async def update_stage_item(
    tournament_id: TournamentId,
    stage_item_id: StageItemId,
    stage_item_body: StageItemUpdateBody,
    _: UserPublic = Depends(firebase_user_authenticated),
    stage_item: StageItemWithRounds = Depends(stage_item_dependency),
) -> SuccessResponse:
    if stage_item is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not find all stages",
        )

    query = """
        UPDATE stage_items
        SET name = :name
        WHERE stage_items.id = :stage_item_id
    """
    await database.execute(
        query=query,
        values={"stage_item_id": stage_item_id, "name": stage_item_body.name},
    )
    await recalculate_ranking_for_stage_item(tournament_id, stage_item)
    if stage_item.type == StageType.SINGLE_ELIMINATION:
        await update_inputs_in_complete_elimination_stage_item(stage_item)
    return SuccessResponse()


@router.post(
    "/tournaments/{tournament_id}/stage_items/{stage_item_id}/start_next_round",
    response_model=SuccessResponse,
)
async def start_next_round(
    tournament_id: TournamentId,
    stage_item_id: StageItemId,
    active_next_body: StageItemActivateNextBody,
    stage_item: StageItemWithRounds = Depends(stage_item_dependency),
    user: UserPublic = Depends(firebase_user_authenticated),
    elo_diff_threshold: int = 200,
    iterations: int = 2_000,
    only_recommended: bool = False,
) -> SuccessResponse:
    draft_round = get_draft_round(stage_item)
    if draft_round is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="There is already a draft round in this stage item, please delete it first",
        )

    match_filter = MatchFilter(
        elo_diff_threshold=elo_diff_threshold,
        only_recommended=only_recommended,
        limit=1,
        iterations=iterations,
    )
    all_matches_to_schedule = get_upcoming_matches_for_swiss(match_filter, stage_item)
    if len(all_matches_to_schedule) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No more matches to schedule, all combinations of teams have been added already",
        )

    stages = await get_full_tournament_details(tournament_id)
    existing_rounds = [
        round_
        for stage in stages
        for stage_item in stage.stage_items
        for round_ in stage_item.rounds
    ]
    check_requirement(existing_rounds, user, "max_rounds")

    round_id = await sql_create_round(
        RoundInsertable(
            created=datetime_utc.now(),
            is_draft=True,
            stage_item_id=stage_item_id,
            name=await get_next_round_name(tournament_id, stage_item_id),
        ),
    )
    draft_round = await get_round_by_id(tournament_id, round_id)
    tournament = await sql_get_tournament(tournament_id)
    courts = await get_all_courts_in_tournament(tournament_id)

    limit = len(courts) - len(draft_round.matches)
    for ___ in range(limit):
        stage_item = await get_stage_item(tournament_id, stage_item_id)
        draft_round = next(round_ for round_ in stage_item.rounds if round_.is_draft)
        all_matches_to_schedule = get_upcoming_matches_for_swiss(
            match_filter, stage_item, draft_round
        )
        if len(all_matches_to_schedule) < 1:
            break

        match = all_matches_to_schedule[0]
        assert isinstance(match, SuggestedMatch)

        assert draft_round.id and match.stage_item_input1.id and match.stage_item_input2.id
        await sql_create_match(
            MatchCreateBody(
                round_id=draft_round.id,
                stage_item_input1_id=match.stage_item_input1.id,
                stage_item_input2_id=match.stage_item_input2.id,
                court_id=None,
                stage_item_input1_winner_from_match_id=None,
                stage_item_input2_winner_from_match_id=None,
                duration_minutes=tournament.duration_minutes,
                margin_minutes=tournament.margin_minutes,
                custom_duration_minutes=None,
                custom_margin_minutes=None,
            ),
        )

    draft_round = await get_round_by_id(tournament_id, round_id)
    try:
        await schedule_all_matches_for_swiss_round(
            tournament_id, draft_round, active_next_body.adjust_to_time
        )
    except MatchTimingAdjustmentInfeasible as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    await set_round_active_or_draft(draft_round.id, tournament_id, is_draft=False)
    await handle_conflicts(await get_full_tournament_details(tournament_id))
    return SuccessResponse()
