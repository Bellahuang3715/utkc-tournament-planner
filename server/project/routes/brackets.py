from fastapi import APIRouter, Depends, Query

from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.models.db.bracket import DivisionBracketsCreateBody, DivisionTeamBracketsCreateBody
from project.models.db.bracket_cell import (
    BracketCellsReplaceBody,
    DivisionBracketCellsReplaceBody,
)
from project.routes.models import (
    BracketsResponse,
    BracketsWithPlayersResponse,
    BracketsWithTeamsResponse,
    BracketCellsResponse,
    BracketResponse,
    SuccessResponse,
)
from project.sql.brackets import (
    sql_list_division_brackets,
    sql_list_division_brackets_with_players,
    sql_list_division_brackets_with_teams,
    sql_create_division_brackets,
    sql_create_division_brackets_teams,
    sql_get_or_create_finals_bracket,
    sql_update_bracket_title,
)
from project.utils.id_types import DivisionId, BracketId
from project.models.db.bracket import BracketTitleUpdateBody
from project.sql.bracket_cells import (
    sql_list_bracket_cells,
    sql_list_division_bracket_cells,
    sql_replace_bracket_cells,
    sql_replace_division_bracket_cells,
)

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


@router.get("/divisions/{division_id}/bracket-cells", response_model=BracketCellsResponse)
async def list_division_bracket_cells(
    division_id: DivisionId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketCellsResponse:
    return BracketCellsResponse(data=await sql_list_division_bracket_cells(division_id))


@router.put("/divisions/{division_id}/bracket-cells", response_model=SuccessResponse)
async def replace_division_bracket_cells(
    division_id: DivisionId,
    body: DivisionBracketCellsReplaceBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_replace_division_bracket_cells(division_id, body.brackets)
    return SuccessResponse()


@router.get("/brackets/{bracket_id}/cells", response_model=BracketCellsResponse)
async def list_bracket_cells(
    bracket_id: BracketId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketCellsResponse:
    return BracketCellsResponse(data=await sql_list_bracket_cells(bracket_id))


@router.put("/brackets/{bracket_id}/cells", response_model=SuccessResponse)
async def replace_bracket_cells(
    bracket_id: BracketId,
    body: BracketCellsReplaceBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_replace_bracket_cells(bracket_id, body.cells)
    return SuccessResponse()


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


@router.post("/divisions/{division_id}/brackets/finals", response_model=BracketResponse)
async def get_or_create_finals_bracket(
    division_id: DivisionId,
    num_players: int = Query(..., ge=2, description="Opening slot count for finals (= number of groups)"),
    _: UserPublic = Depends(firebase_user_authenticated),
) -> BracketResponse:
    return BracketResponse(
        data=await sql_get_or_create_finals_bracket(division_id, num_players),
    )


@router.patch("/brackets/{bracket_id}/title", response_model=SuccessResponse)
async def update_bracket_title(
    bracket_id: BracketId,
    body: BracketTitleUpdateBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_update_bracket_title(bracket_id, body.title)
    return SuccessResponse()
