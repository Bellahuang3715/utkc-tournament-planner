from typing import Optional

from fastapi import APIRouter, Depends, Query

from project.models.db.division import DivisionCreateBody, DivisionUpdateBody, DivisionPlayersAttachBody
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import (
    DivisionResponse,
    DivisionsResponse,
    SuccessResponse,
)
from project.sql.divisions import (
    create_division,
    get_divisions_for_tournament,
    sql_delete_division,
    sql_update_division,
    sql_attach_players_to_division
)
from project.utils.id_types import DivisionId, TournamentId

router = APIRouter()


@router.get("/divisions", response_model=DivisionsResponse)
async def list_divisions(
    tournament_id: TournamentId = Query(...),
    q: Optional[str] = Query(None, description="Optional search string for name/prefix"),
    _: UserPublic = Depends(firebase_user_authenticated),
) -> DivisionsResponse:
    items = await get_divisions_for_tournament(tournament_id, q)
    return DivisionsResponse(data=items)


@router.post("/divisions", response_model=DivisionResponse)
async def create_new_division(
    body: DivisionCreateBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> DivisionResponse:
    created = await create_division(body)
    return DivisionResponse(data=created)


@router.put("/divisions/{division_id}", response_model=DivisionResponse)
async def update_division(
    division_id: DivisionId,
    body: DivisionUpdateBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> DivisionResponse:
    updated = await sql_update_division(division_id, body)
    return DivisionResponse(data=updated)


@router.delete("/divisions/{division_id}", response_model=SuccessResponse)
async def delete_division(
    division_id: DivisionId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_delete_division(division_id)
    return SuccessResponse()


@router.post("/divisions/{division_id}/players", response_model=SuccessResponse)
async def attach_players_to_division(
    division_id: DivisionId,
    body: DivisionPlayersAttachBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_attach_players_to_division(division_id, body.player_ids)
    return SuccessResponse()
