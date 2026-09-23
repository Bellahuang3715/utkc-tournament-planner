from fastapi import APIRouter, Depends, Query, Request

from project.models.db.bracket_edit_lock import (
    BracketEditLockClaimBody,
    BracketEditLockReleaseBody,
)
from project.models.db.division import Division
from project.routes.authorization import (
    require_bracket_owner,
    require_bracket_score_access,
    require_division_owner,
    require_division_score_access,
)
from project.models.db.bracket import DivisionBracketsCreateBody, DivisionTeamBracketsCreateBody
from project.models.db.bracket_cell import (
    BracketCellsReplaceBody,
    DivisionBracketCellsReplaceBody,
    DivisionTeamBracketCellsReplaceBody,
    TeamBracketCellsReplaceBody,
)
from project.routes.models import (
    BracketEditLockResponse,
    BracketEditLocksResponse,
    BracketsResponse,
    BracketsWithPlayersResponse,
    BracketsWithTeamsResponse,
    BracketCellsResponse,
    TeamBracketCellsResponse,
    BracketResponse,
    SuccessResponse,
)
from project.sql.bracket_edit_locks import (
    assert_session_can_write_bracket,
    assert_session_can_write_brackets,
    sql_claim_edit_lock,
    sql_heartbeat_edit_lock,
    sql_list_active_edit_locks,
    sql_release_edit_lock,
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

EDIT_SESSION_HEADER = "X-Edit-Session-Id"


def _edit_session_id(request: Request) -> str | None:
    raw = request.headers.get(EDIT_SESSION_HEADER)
    return raw.strip() if raw and raw.strip() else None


@router.get("/divisions/{division_id}/brackets", response_model=BracketsResponse)
async def list_division_brackets(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> BracketsResponse:
    return BracketsResponse(data=await sql_list_division_brackets(division_id))


@router.get("/divisions/{division_id}/brackets/with-players", response_model=BracketsWithPlayersResponse)
async def list_division_brackets_with_players(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> BracketsWithPlayersResponse:
    return BracketsWithPlayersResponse(data=await sql_list_division_brackets_with_players(division_id))


@router.get("/divisions/{division_id}/brackets/with-teams", response_model=BracketsWithTeamsResponse)
async def list_division_brackets_with_teams(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> BracketsWithTeamsResponse:
    return BracketsWithTeamsResponse(data=await sql_list_division_brackets_with_teams(division_id))


@router.get("/divisions/{division_id}/bracket-cells", response_model=BracketCellsResponse)
async def list_division_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> BracketCellsResponse:
    """Player bracket cells (scores + advances)."""
    return BracketCellsResponse(data=await sql_list_division_bracket_cells(division_id))


@router.put("/divisions/{division_id}/bracket-cells", response_model=SuccessResponse)
async def replace_division_bracket_cells(
    division_id: DivisionId,
    body: DivisionBracketCellsReplaceBody,
    request: Request,
    _: Division = Depends(require_division_score_access),
) -> SuccessResponse:
    await assert_session_can_write_brackets(
        [item.bracket_id for item in body.brackets],
        session_id=_edit_session_id(request),
    )
    await sql_replace_division_bracket_cells(division_id, body.brackets)
    return SuccessResponse()


@router.delete("/divisions/{division_id}/bracket-cells", response_model=SuccessResponse)
async def clear_division_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
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
    _: Division = Depends(require_division_score_access),
) -> TeamBracketCellsResponse:
    """Team bracket cells (advances only)."""
    return TeamBracketCellsResponse(
        data=await sql_list_division_team_bracket_cells(division_id)
    )


@router.put("/divisions/{division_id}/team-bracket-cells", response_model=SuccessResponse)
async def replace_division_team_bracket_cells(
    division_id: DivisionId,
    body: DivisionTeamBracketCellsReplaceBody,
    request: Request,
    _: Division = Depends(require_division_score_access),
) -> SuccessResponse:
    await assert_session_can_write_brackets(
        [item.bracket_id for item in body.brackets],
        session_id=_edit_session_id(request),
    )
    await sql_replace_division_team_bracket_cells(division_id, body.brackets)
    return SuccessResponse()


@router.delete(
    "/divisions/{division_id}/team-bracket-cells",
    response_model=SuccessResponse,
)
async def clear_division_team_bracket_cells(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> SuccessResponse:
    """Clear team advances for the division (also clears player cells; unlocks roster/seeding)."""
    await sql_clear_division_bracket_cells(division_id)
    return SuccessResponse()


@router.get("/brackets/{bracket_id}/cells", response_model=BracketCellsResponse)
async def list_bracket_cells(
    bracket_id: BracketId,
    _: TournamentId = Depends(require_bracket_score_access),
) -> BracketCellsResponse:
    return BracketCellsResponse(data=await sql_list_bracket_cells(bracket_id))


@router.put("/brackets/{bracket_id}/cells", response_model=SuccessResponse)
async def replace_bracket_cells(
    bracket_id: BracketId,
    body: BracketCellsReplaceBody,
    request: Request,
    _: TournamentId = Depends(require_bracket_score_access),
) -> SuccessResponse:
    await assert_session_can_write_bracket(
        bracket_id, session_id=_edit_session_id(request)
    )
    await sql_replace_bracket_cells(bracket_id, body.cells)
    return SuccessResponse()


@router.get("/brackets/{bracket_id}/team-cells", response_model=TeamBracketCellsResponse)
async def list_team_bracket_cells(
    bracket_id: BracketId,
    _: TournamentId = Depends(require_bracket_score_access),
) -> TeamBracketCellsResponse:
    return TeamBracketCellsResponse(data=await sql_list_team_bracket_cells(bracket_id))


@router.put("/brackets/{bracket_id}/team-cells", response_model=SuccessResponse)
async def replace_team_bracket_cells(
    bracket_id: BracketId,
    body: TeamBracketCellsReplaceBody,
    request: Request,
    _: TournamentId = Depends(require_bracket_score_access),
) -> SuccessResponse:
    await assert_session_can_write_bracket(
        bracket_id, session_id=_edit_session_id(request)
    )
    await sql_replace_team_bracket_cells(bracket_id, body.cells)
    return SuccessResponse()


@router.get(
    "/divisions/{division_id}/edit-locks",
    response_model=BracketEditLocksResponse,
)
async def list_division_edit_locks(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> BracketEditLocksResponse:
    return BracketEditLocksResponse(
        data=await sql_list_active_edit_locks(division_id)
    )


@router.post(
    "/brackets/{bracket_id}/edit-lock",
    response_model=BracketEditLockResponse,
)
async def claim_bracket_edit_lock(
    bracket_id: BracketId,
    body: BracketEditLockClaimBody,
    _: TournamentId = Depends(require_bracket_score_access),
) -> BracketEditLockResponse:
    lock = await sql_claim_edit_lock(
        bracket_id,
        session_id=body.session_id,
        holder_name=body.holder_name,
    )
    return BracketEditLockResponse(data=lock)


@router.post(
    "/brackets/{bracket_id}/edit-lock/heartbeat",
    response_model=BracketEditLockResponse,
)
async def heartbeat_bracket_edit_lock(
    bracket_id: BracketId,
    body: BracketEditLockReleaseBody,
    _: TournamentId = Depends(require_bracket_score_access),
) -> BracketEditLockResponse:
    lock = await sql_heartbeat_edit_lock(bracket_id, session_id=body.session_id)
    return BracketEditLockResponse(data=lock)


@router.delete(
    "/brackets/{bracket_id}/edit-lock",
    response_model=SuccessResponse,
)
async def release_bracket_edit_lock(
    bracket_id: BracketId,
    session_id: str = Query(..., min_length=1),
    _: TournamentId = Depends(require_bracket_score_access),
) -> SuccessResponse:
    await sql_release_edit_lock(bracket_id, session_id=session_id)
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
    _: Division = Depends(require_division_score_access),
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
