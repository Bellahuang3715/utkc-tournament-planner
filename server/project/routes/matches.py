from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from project.logic.planning.conflicts import handle_conflicts
from project.logic.planning.matches import (
    get_scheduled_matches,
    handle_match_reschedule,
    reorder_matches_for_court,
    schedule_all_unscheduled_matches,
)
from project.logic.ranking.calculation import (
    recalculate_ranking_for_stage_item,
)
from project.logic.ranking.elimination import update_inputs_in_subsequent_elimination_rounds
from project.logic.scheduling.upcoming_matches import (
    get_draft_round_in_stage_item,
    get_upcoming_matches_for_swiss,
)
from project.models.db.match import (
    Match,
    MatchBody,
    MatchCreateBody,
    MatchCreateBodyFrontend,
    MatchFilter,
    MatchRescheduleBody,
)
from project.models.db.stage_item import StageType
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import SingleMatchResponse, SuccessResponse, UpcomingMatchesResponse
from project.routes.util import match_dependency
from project.sql.courts import get_all_courts_in_tournament
from project.sql.matches import sql_create_match, sql_delete_match, sql_update_match
from project.sql.rounds import get_round_by_id
from project.sql.stage_items import get_stage_item
from project.sql.stages import get_full_tournament_details
from project.sql.tournaments import sql_get_tournament
from project.sql.validation import check_foreign_keys_belong_to_tournament
from project.utils.id_types import MatchId, StageItemId, TournamentId
from project.utils.types import assert_some

router = APIRouter()


@router.get(
    "/tournaments/{tournament_id}/stage_items/{stage_item_id}/upcoming_matches",
    response_model=UpcomingMatchesResponse,
)
async def get_matches_to_schedule(
    tournament_id: TournamentId,
    stage_item_id: StageItemId,
    elo_diff_threshold: int = 200,
    iterations: int = 2_000,
    only_recommended: bool = False,
    limit: int = 50,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> UpcomingMatchesResponse:
    match_filter = MatchFilter(
        elo_diff_threshold=elo_diff_threshold,
        only_recommended=only_recommended,
        limit=limit,
        iterations=iterations,
    )

    draft_round, stage_item = await get_draft_round_in_stage_item(tournament_id, stage_item_id)
    courts = await get_all_courts_in_tournament(tournament_id)
    if len(courts) <= len(draft_round.matches):
        return UpcomingMatchesResponse(data=[])

    return UpcomingMatchesResponse(
        data=get_upcoming_matches_for_swiss(match_filter, stage_item, draft_round)
    )


@router.delete("/tournaments/{tournament_id}/matches/{match_id}", response_model=SuccessResponse)
async def delete_match(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
    match: Match = Depends(match_dependency),
) -> SuccessResponse:
    round_ = await get_round_by_id(tournament_id, match.round_id)
    stage_item = await get_stage_item(tournament_id, round_.stage_item_id)

    if not round_.is_draft or stage_item.type != StageType.SWISS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete matches from draft rounds in Swiss stage items",
        )

    await sql_delete_match(match.id)

    stage_item = await get_stage_item(tournament_id, round_.stage_item_id)

    await recalculate_ranking_for_stage_item(tournament_id, stage_item)
    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/matches", response_model=SingleMatchResponse)
async def create_match(
    tournament_id: TournamentId,
    match_body: MatchCreateBodyFrontend,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SingleMatchResponse:
    await check_foreign_keys_belong_to_tournament(match_body, tournament_id)

    round_ = await get_round_by_id(tournament_id, match_body.round_id)
    stage_item = await get_stage_item(tournament_id, round_.stage_item_id)

    if not round_.is_draft or stage_item.type != StageType.SWISS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only create matches in draft rounds of Swiss stage items",
        )

    tournament = await sql_get_tournament(tournament_id)
    body_with_durations = MatchCreateBody(
        **match_body.model_dump(),
        duration_minutes=tournament.duration_minutes,
        margin_minutes=tournament.margin_minutes,
    )

    return SingleMatchResponse(data=await sql_create_match(body_with_durations))


@router.post("/tournaments/{tournament_id}/schedule_matches", response_model=SuccessResponse)
async def schedule_matches(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    stages = await get_full_tournament_details(tournament_id)
    await schedule_all_unscheduled_matches(tournament_id, stages)
    return SuccessResponse()


@router.post(
    "/tournaments/{tournament_id}/matches/{match_id}/reschedule", response_model=SuccessResponse
)
async def reschedule_match(
    tournament_id: TournamentId,
    match_id: MatchId,
    body: MatchRescheduleBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await check_foreign_keys_belong_to_tournament(body, tournament_id)
    await handle_match_reschedule(tournament_id, body, match_id)
    await handle_conflicts(await get_full_tournament_details(tournament_id))
    return SuccessResponse()


@router.put("/tournaments/{tournament_id}/matches/{match_id}", response_model=SuccessResponse)
async def update_match_by_id(
    tournament_id: TournamentId,
    match_id: MatchId,
    match_body: MatchBody,
    _: UserPublic = Depends(firebase_user_authenticated),
    match: Match = Depends(match_dependency),
) -> SuccessResponse:
    await check_foreign_keys_belong_to_tournament(match_body, tournament_id)
    tournament = await sql_get_tournament(tournament_id)

    await sql_update_match(match_id, match_body, tournament)

    round_ = await get_round_by_id(tournament_id, match.round_id)
    stage_item = await get_stage_item(tournament_id, round_.stage_item_id)
    await recalculate_ranking_for_stage_item(tournament_id, stage_item)

    if (
        match_body.custom_duration_minutes != match.custom_duration_minutes
        or match_body.custom_margin_minutes != match.custom_margin_minutes
    ):
        tournament = await sql_get_tournament(tournament_id)
        scheduled_matches = get_scheduled_matches(await get_full_tournament_details(tournament_id))
        await reorder_matches_for_court(tournament, scheduled_matches, assert_some(match.court_id))

    if stage_item.type == StageType.SINGLE_ELIMINATION:
        await update_inputs_in_subsequent_elimination_rounds(round_.id, stage_item, {match_id})

    return SuccessResponse()
