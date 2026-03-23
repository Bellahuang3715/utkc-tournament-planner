from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from starlette import status

from project.models.db.team_category import TeamCategoryBody, TeamCategoryInsertable
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import SingleTeamCategoryResponse, SuccessResponse, TeamCategoriesResponse
from project.sql.team_categories import (
    sql_count_teams_using_category,
    sql_delete_team_category,
    sql_get_team_category_by_id,
    sql_insert_team_category,
    sql_list_team_categories,
    sql_next_team_category_position,
    sql_update_team_category,
)
from project.sql.validation import check_foreign_keys_belong_to_tournament
from project.utils.id_types import TeamCategoryId, TournamentId
from project.utils.types import assert_some

router = APIRouter()


class _CategoryIdCheck(BaseModel):
    category_id: TeamCategoryId


@router.get(
    "/tournaments/{tournament_id}/team_categories",
    response_model=TeamCategoriesResponse,
)
async def list_team_categories(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> TeamCategoriesResponse:
    return TeamCategoriesResponse(data=await sql_list_team_categories(tournament_id))


@router.post(
    "/tournaments/{tournament_id}/team_categories",
    response_model=SingleTeamCategoryResponse,
)
async def create_team_category(
    tournament_id: TournamentId,
    body: TeamCategoryBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SingleTeamCategoryResponse:
    pos = await sql_next_team_category_position(tournament_id)
    row = TeamCategoryInsertable(
        tournament_id=tournament_id,
        name=body.name,
        color=body.color,
        position=pos,
    )
    created = await sql_insert_team_category(row)
    return SingleTeamCategoryResponse(data=created)


@router.put(
    "/tournaments/{tournament_id}/team_categories/{category_id}",
    response_model=SingleTeamCategoryResponse,
)
async def update_team_category(
    tournament_id: TournamentId,
    category_id: TeamCategoryId,
    body: TeamCategoryBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SingleTeamCategoryResponse:
    await check_foreign_keys_belong_to_tournament(
        _CategoryIdCheck(category_id=category_id),
        tournament_id,
    )
    existing = await sql_get_team_category_by_id(tournament_id, category_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    await sql_update_team_category(
        tournament_id,
        category_id,
        name=body.name,
        color=body.color,
        position=body.position,
    )
    return SingleTeamCategoryResponse(
        data=assert_some(await sql_get_team_category_by_id(tournament_id, category_id))
    )


@router.delete(
    "/tournaments/{tournament_id}/team_categories/{category_id}",
    response_model=SuccessResponse,
)
async def delete_team_category(
    tournament_id: TournamentId,
    category_id: TeamCategoryId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    existing = await sql_get_team_category_by_id(tournament_id, category_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    n = await sql_count_teams_using_category(tournament_id, category_id)
    if n > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category: {n} team(s) still use it",
        )

    await sql_delete_team_category(tournament_id, category_id)
    return SuccessResponse()
