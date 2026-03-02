from typing import Optional
from fastapi import APIRouter, Depends, Query

from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.models.db.bracket import DivisionBracketsCreateBody, DivisionTeamBracketsCreateBody
from project.routes.models import (
    BracketsResponse,
    BracketsWithPlayersResponse,
    BracketsWithTeamsResponse,
    SuccessResponse,
)
from project.sql.brackets import (
    sql_list_division_brackets,
    sql_list_division_brackets_with_players,
    sql_list_division_brackets_with_teams,
    sql_create_division_brackets,
    sql_create_division_brackets_teams,
)
from project.utils.id_types import DivisionId, BracketId
from project.models.db.bracket import BracketTitleUpdateBody
from project.sql.brackets import sql_update_bracket_title

router = APIRouter()


@router.get("/divisions/{division_id}/brackets", response_model=BracketsResponse)
async def list_division_brackets(
    division_id: DivisionId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketsResponse:
    return BracketsResponse(data=await sql_list_division_brackets(division_id))


@router.get("/divisions/{division_id}/brackets/with-players", response_model=BracketsWithPlayersResponse)
async def list_division_brackets_with_players(
    division_id: DivisionId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketsWithPlayersResponse:
    return BracketsWithPlayersResponse(data=await sql_list_division_brackets_with_players(division_id))


@router.get("/divisions/{division_id}/brackets/with-teams", response_model=BracketsWithTeamsResponse)
async def list_division_brackets_with_teams(
    division_id: DivisionId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketsWithTeamsResponse:
    return BracketsWithTeamsResponse(data=await sql_list_division_brackets_with_teams(division_id))


@router.post("/divisions/{division_id}/brackets", response_model=BracketsResponse)
async def create_division_brackets(
    division_id: DivisionId,
    body: DivisionBracketsCreateBody,
    replace: bool = Query(False, description="Delete existing brackets for this division before inserting"),
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketsResponse:
    created = await sql_create_division_brackets(division_id, body, replace=replace)
    return BracketsResponse(data=created)


@router.post("/divisions/{division_id}/brackets/teams", response_model=BracketsResponse)
async def create_division_brackets_teams(
    division_id: DivisionId,
    body: DivisionTeamBracketsCreateBody,
    replace: bool = Query(False, description="Delete existing brackets for this division before inserting"),
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketsResponse:
    created = await sql_create_division_brackets_teams(division_id, body, replace=replace)
    return BracketsResponse(data=created)


@router.patch("/brackets/{bracket_id}/title", response_model=SuccessResponse)
async def update_bracket_title(
    bracket_id: BracketId,
    body: BracketTitleUpdateBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_update_bracket_title(bracket_id, body.title)
    return SuccessResponse()
