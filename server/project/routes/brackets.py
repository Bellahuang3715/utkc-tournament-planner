from fastapi import APIRouter, Depends, Query

from project.models.db.division import Division
from project.routes.authorization import require_bracket_owner, require_division_owner
from project.models.db.bracket import DivisionBracketsCreateBody, DivisionTeamBracketsCreateBody
from project.models.db.bracket_cell import (
    BracketCellsReplaceBody,
    DivisionBracketCellsReplaceBody,
    DivisionTeamBracketCellsReplaceBody,
    TeamBracketCellsReplaceBody,
)
from project.routes.models import (
    BracketsResponse,
    BracketsWithPlayersResponse,
    BracketsWithTeamsResponse,
    BracketCellsResponse,
    TeamBracketCellsResponse,
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
from project.utils.id_types import BracketId, DivisionId, TournamentId
from project.models.db.bracket import BracketTitleUpdateBody
from project.sql.bracket_cells import (
    sql_clear_division_bracket_cells,
    sql_ensure_division_unlocked,
    sql_list_bracket_cells,
    sql_list_division_bracket_cells,
    sql_list_division_team_bracket_cells,
    sql_list_team_bracket_cells,
    sql_replace_bracket_cells,
    sql_replace_division_bracket_cells,
    sql_replace_division_team_bracket_cells,
    sql_replace_team_bracket_cells,
)

router = APIRouter()


@router.get("/divisions/{division_id}/brackets", response_model=BracketsResponse)
async def list_division_brackets(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> BracketsResponse:
    return BracketsResponse(data=await sql_list_division_brackets(division_id))


@router.get("/divisions/{division_id}/brackets/with-players", response_model=BracketsWithPlayersResponse)
async def list_division_brackets_with_players(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> BracketsWithPlayersResponse:
    return BracketsWithPlayersResponse(data=await sql_list_division_brackets_with_players(division_id))


@router.get("/divisions/{division_id}/brackets/with-teams", response_model=BracketsWithTeamsResponse)
async def list_division_brackets_with_teams(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> BracketsWithTeamsResponse:
    return BracketsWithTeamsResponse(data=await sql_list_division_brackets_with_teams(division_id))


@router.get("/divisions/{division_id}/bracket-cells", response_model=BracketCellsResponse)
async def list_division_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> BracketCellsResponse:
    """Player bracket cells (scores + advances)."""
    return BracketCellsResponse(data=await sql_list_division_bracket_cells(division_id))


@router.put("/divisions/{division_id}/bracket-cells", response_model=SuccessResponse)
async def replace_division_bracket_cells(
    division_id: DivisionId,
    body: DivisionBracketCellsReplaceBody,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_replace_division_bracket_cells(division_id, body.brackets)
    return SuccessResponse()


@router.delete("/divisions/{division_id}/bracket-cells", response_model=SuccessResponse)
async def clear_division_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    """Clear all recorded scores/advances for the division (player + team; unlocks roster/seeding)."""
    await sql_clear_division_bracket_cells(division_id)
    return SuccessResponse()


@router.get(
    "/divisions/{division_id}/team-bracket-cells",
    response_model=TeamBracketCellsResponse,
)
async def list_division_team_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> TeamBracketCellsResponse:
    """Team bracket cells (advances only)."""
    return TeamBracketCellsResponse(
        data=await sql_list_division_team_bracket_cells(division_id)
    )


@router.put("/divisions/{division_id}/team-bracket-cells", response_model=SuccessResponse)
async def replace_division_team_bracket_cells(
    division_id: DivisionId,
    body: DivisionTeamBracketCellsReplaceBody,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_replace_division_team_bracket_cells(division_id, body.brackets)
    return SuccessResponse()


@router.delete(
    "/divisions/{division_id}/team-bracket-cells",
    response_model=SuccessResponse,
)
async def clear_division_team_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    """Clear team advances for the division (also clears player cells; unlocks roster/seeding)."""
    await sql_clear_division_bracket_cells(division_id)
    return SuccessResponse()


@router.get("/brackets/{bracket_id}/cells", response_model=BracketCellsResponse)
async def list_bracket_cells(
    bracket_id: BracketId,
    _: TournamentId = Depends(require_bracket_owner),
) -> BracketCellsResponse:
    return BracketCellsResponse(data=await sql_list_bracket_cells(bracket_id))


@router.put("/brackets/{bracket_id}/cells", response_model=SuccessResponse)
async def replace_bracket_cells(
    bracket_id: BracketId,
    body: BracketCellsReplaceBody,
    _: TournamentId = Depends(require_bracket_owner),
) -> SuccessResponse:
    await sql_replace_bracket_cells(bracket_id, body.cells)
    return SuccessResponse()


@router.get("/brackets/{bracket_id}/team-cells", response_model=TeamBracketCellsResponse)
async def list_team_bracket_cells(
    bracket_id: BracketId,
    _: TournamentId = Depends(require_bracket_owner),
) -> TeamBracketCellsResponse:
    return TeamBracketCellsResponse(data=await sql_list_team_bracket_cells(bracket_id))


@router.put("/brackets/{bracket_id}/team-cells", response_model=SuccessResponse)
async def replace_team_bracket_cells(
    bracket_id: BracketId,
    body: TeamBracketCellsReplaceBody,
    _: TournamentId = Depends(require_bracket_owner),
) -> SuccessResponse:
    await sql_replace_team_bracket_cells(bracket_id, body.cells)
    return SuccessResponse()


@router.post("/divisions/{division_id}/brackets", response_model=BracketsResponse)
async def create_division_brackets(
    division_id: DivisionId,
    body: DivisionBracketsCreateBody,
    replace: bool = Query(False, description="Delete existing brackets for this division before inserting"),
    _: Division = Depends(require_division_owner),
) -> BracketsResponse:
    await sql_ensure_division_unlocked(division_id)
    created = await sql_create_division_brackets(division_id, body, replace=replace)
    return BracketsResponse(data=created)


@router.post("/divisions/{division_id}/brackets/teams", response_model=BracketsResponse)
async def create_division_brackets_teams(
    division_id: DivisionId,
    body: DivisionTeamBracketsCreateBody,
    replace: bool = Query(False, description="Delete existing brackets for this division before inserting"),
    _: Division = Depends(require_division_owner),
) -> BracketsResponse:
    await sql_ensure_division_unlocked(division_id)
    created = await sql_create_division_brackets_teams(division_id, body, replace=replace)
    return BracketsResponse(data=created)


@router.post("/divisions/{division_id}/brackets/finals", response_model=BracketResponse)
async def get_or_create_finals_bracket(
    division_id: DivisionId,
    num_players: int = Query(..., ge=2, description="Opening slot count for finals (= number of groups)"),
    _: Division = Depends(require_division_owner),
) -> BracketResponse:
    return BracketResponse(
        data=await sql_get_or_create_finals_bracket(division_id, num_players),
    )


@router.patch("/brackets/{bracket_id}/title", response_model=SuccessResponse)
async def update_bracket_title(
    bracket_id: BracketId,
    body: BracketTitleUpdateBody,
    _: TournamentId = Depends(require_bracket_owner),
) -> SuccessResponse:
    await sql_update_bracket_title(bracket_id, body.title)
    return SuccessResponse()
