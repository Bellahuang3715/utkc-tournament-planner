import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from project.models.db.division import (
    Division,
    DivisionCreateBody,
    DivisionUpdateBody,
    DivisionPlayersAttachBody,
    DivisionTeamsAttachBody,
    DivisionPlayersDetachBody,
    DivisionTeamsDetachBody,
    IndividualsPlayerMembership,
)
from project.models.db.tournament import Tournament
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.authorization import (
    assert_user_owns_tournament,
    require_division_owner,
    require_division_score_access,
    require_tournament_score_access,
)
from project.routes.models import (
    DivisionResponse,
    DivisionsResponse,
    DivisionPlayersResponse,
    DivisionTeamsResponse,
    DivisionLockResponse,
    DivisionLockStatus,
    IndividualsMembershipsResponse,
    SuccessResponse,
)
from project.sql.bracket_cells import (
    sql_division_is_locked,
    sql_ensure_division_unlocked,
)
from project.sql.divisions import (
    create_division,
    get_divisions_for_tournament,
    sql_delete_division,
    sql_division_name_exists,
    sql_division_prefix_exists,
    sql_update_division,
    sql_attach_players_to_division,
    sql_find_individuals_attach_conflicts,
    sql_get_players_for_division,
    sql_list_individuals_memberships,
    sql_attach_teams_to_division,
    sql_get_teams_for_division,
    sql_detach_players_from_division,
    sql_detach_teams_from_division,
)
from project.utils.id_types import DivisionId, TournamentId

router = APIRouter()

DUPLICATE_DIVISION_NAME_DETAIL = (
    "A division with this name already exists in this tournament. "
    "Division names must be unique."
)
DUPLICATE_DIVISION_PREFIX_DETAIL = (
    "A division with this prefix already exists in this tournament. "
    "Prefixes must be unique."
)


def _individuals_attach_conflict_detail(
    conflicts: list[IndividualsPlayerMembership],
) -> str:
    seen: set[int] = set()
    parts: list[str] = []
    for m in conflicts:
        if m.player_id in seen:
            continue
        seen.add(m.player_id)
        parts.append(f"{m.player_name} ({m.division_name})")
    names = ", ".join(parts)
    return (
        "These players are already in another individuals division and cannot be "
        f"added here when player codes / prefixes are involved: {names}."
    )


async def _ensure_unique_division_identity(
    tournament_id: TournamentId,
    *,
    name: str,
    prefix: str | None,
    exclude_division_id: DivisionId | None = None,
) -> None:
    cleaned_name = name.strip()
    cleaned_prefix = prefix.strip() if prefix and prefix.strip() else None

    if await sql_division_name_exists(
        tournament_id,
        cleaned_name,
        exclude_division_id=exclude_division_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=DUPLICATE_DIVISION_NAME_DETAIL,
        )

    if cleaned_prefix and await sql_division_prefix_exists(
        tournament_id,
        cleaned_prefix,
        exclude_division_id=exclude_division_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=DUPLICATE_DIVISION_PREFIX_DETAIL,
        )


@router.get("/tournaments/{tournament_id}/divisions", response_model=DivisionsResponse)
async def list_divisions_for_tournament(
    tournament_id: TournamentId,
    _: Tournament = Depends(require_tournament_score_access),
) -> DivisionsResponse:
    items = await get_divisions_for_tournament(tournament_id)
    return DivisionsResponse(data=items)


@router.get(
    "/tournaments/{tournament_id}/individuals-memberships",
    response_model=IndividualsMembershipsResponse,
)
async def list_individuals_memberships(
    tournament_id: TournamentId,
    _: Tournament = Depends(require_tournament_score_access),
) -> IndividualsMembershipsResponse:
    items = await sql_list_individuals_memberships(tournament_id)
    return IndividualsMembershipsResponse(data=items)


@router.post("/divisions", response_model=DivisionResponse)
async def create_new_division(
    body: DivisionCreateBody,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> DivisionResponse:
    await assert_user_owns_tournament(user, body.tournament_id)
    await _ensure_unique_division_identity(
        body.tournament_id,
        name=body.name,
        prefix=body.prefix,
    )
    try:
        created = await create_division(body)
    except asyncpg.exceptions.UniqueViolationError as exc:
        constraint = (exc.as_dict() or {}).get("constraint_name") or ""
        detail = (
            DUPLICATE_DIVISION_PREFIX_DETAIL
            if "prefix" in constraint
            else DUPLICATE_DIVISION_NAME_DETAIL
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        ) from exc
    return DivisionResponse(data=created)


@router.put("/divisions/{division_id}", response_model=DivisionResponse)
async def update_division(
    division_id: DivisionId,
    body: DivisionUpdateBody,
    division: Division = Depends(require_division_owner),
) -> DivisionResponse:
    await _ensure_unique_division_identity(
        division.tournament_id,
        name=body.name,
        prefix=body.prefix,
        exclude_division_id=division_id,
    )
    try:
        updated = await sql_update_division(division_id, body)
    except asyncpg.exceptions.UniqueViolationError as exc:
        constraint = (exc.as_dict() or {}).get("constraint_name") or ""
        detail = (
            DUPLICATE_DIVISION_PREFIX_DETAIL
            if "prefix" in constraint
            else DUPLICATE_DIVISION_NAME_DETAIL
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        ) from exc
    return DivisionResponse(data=updated)


@router.delete("/divisions/{division_id}", response_model=SuccessResponse)
async def delete_division(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_delete_division(division_id)
    return SuccessResponse()


@router.get("/divisions/{division_id}/players", response_model=DivisionPlayersResponse)
async def list_division_players(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> DivisionPlayersResponse:
    players = await sql_get_players_for_division(division_id)
    return DivisionPlayersResponse(players=players)


@router.get("/divisions/{division_id}/lock", response_model=DivisionLockResponse)
async def get_division_lock_status(
    division_id: DivisionId,
    _: Division = Depends(require_division_score_access),
) -> DivisionLockResponse:
    locked = await sql_division_is_locked(division_id)
    return DivisionLockResponse(data=DivisionLockStatus(locked=locked))


@router.post("/divisions/{division_id}/players", response_model=SuccessResponse)
async def attach_players_to_division(
    division_id: DivisionId,
    body: DivisionPlayersAttachBody,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_ensure_division_unlocked(division_id)
    conflicts = await sql_find_individuals_attach_conflicts(
        division_id, body.player_ids
    )
    if conflicts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_individuals_attach_conflict_detail(conflicts),
        )
    await sql_attach_players_to_division(division_id, body.player_ids, body.bias_player_ids or [])
    return SuccessResponse()


@router.delete("/divisions/{division_id}/players", response_model=SuccessResponse)
async def detach_players_from_division(
    division_id: DivisionId,
    body: DivisionPlayersDetachBody,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_ensure_division_unlocked(division_id)
    await sql_detach_players_from_division(division_id, body.player_ids)
    return SuccessResponse()


@router.get("/divisions/{division_id}/teams", response_model=DivisionTeamsResponse)
async def list_division_teams(
    division_id: DivisionId,
    _: Division = Depends(require_division_owner),
) -> DivisionTeamsResponse:
    teams = await sql_get_teams_for_division(division_id)
    return DivisionTeamsResponse(teams=teams)


@router.post("/divisions/{division_id}/teams", response_model=SuccessResponse)
async def attach_teams_to_division(
    division_id: DivisionId,
    body: DivisionTeamsAttachBody,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_ensure_division_unlocked(division_id)
    await sql_attach_teams_to_division(
        division_id, body.team_ids, body.bias_team_ids or []
    )
    return SuccessResponse()


@router.delete("/divisions/{division_id}/teams", response_model=SuccessResponse)
async def detach_teams_from_division(
    division_id: DivisionId,
    body: DivisionTeamsDetachBody,
    _: Division = Depends(require_division_owner),
) -> SuccessResponse:
    await sql_ensure_division_unlocked(division_id)
    await sql_detach_teams_from_division(division_id, body.team_ids)
    return SuccessResponse()
