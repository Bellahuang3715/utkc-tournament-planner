from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc
from starlette import status

from project.database import database
from project.logic.subscriptions import check_requirement
from project.models.db.court import Court, CourtBody, CourtReorderBody, CourtToInsert
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.authorization import require_tournament_owner
from project.routes.models import CourtsResponse, SingleCourtResponse, SuccessResponse
from project.schema import courts
from project.sql.courts import (
    get_all_courts_in_tournament,
    get_next_court_display_order,
    sql_delete_court,
    sql_reorder_courts,
    update_court,
)
from project.utils.db import fetch_one_parsed
from project.utils.id_types import CourtId, TournamentId
from project.utils.types import assert_some

router = APIRouter(dependencies=[Depends(require_tournament_owner)])


@router.get("/tournaments/{tournament_id}/courts", response_model=CourtsResponse)
async def get_courts(
    tournament_id: TournamentId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> CourtsResponse:
    return CourtsResponse(data=await get_all_courts_in_tournament(tournament_id))


@router.put("/tournaments/{tournament_id}/courts/reorder", response_model=CourtsResponse)
async def reorder_courts(
    tournament_id: TournamentId,
    body: CourtReorderBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> CourtsResponse:
    existing = await get_all_courts_in_tournament(tournament_id)
    existing_ids = {c.id for c in existing}
    incoming = list(body.court_ids)
    if len(incoming) != len(existing_ids) or set(incoming) != existing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="court_ids must include every court in the tournament exactly once",
        )
    await sql_reorder_courts(tournament_id, incoming)
    return CourtsResponse(data=await get_all_courts_in_tournament(tournament_id))


@router.put("/tournaments/{tournament_id}/courts/{court_id}", response_model=SingleCourtResponse)
async def update_court_by_id(
    tournament_id: TournamentId,
    court_id: CourtId,
    court_body: CourtBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SingleCourtResponse:
    await update_court(
        tournament_id=tournament_id,
        court_id=court_id,
        court_body=court_body,
    )
    return SingleCourtResponse(
        data=assert_some(
            await fetch_one_parsed(
                database,
                Court,
                courts.select().where(
                    (courts.c.id == court_id) & (courts.c.tournament_id == tournament_id)
                ),
            )
        )
    )

@router.delete("/tournaments/{tournament_id}/courts/{court_id}", response_model=SuccessResponse)
async def delete_court(
    tournament_id: TournamentId,
    court_id: CourtId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_delete_court(tournament_id, court_id)
    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/courts", response_model=SingleCourtResponse)
async def create_court(
    court_body: CourtBody,
    tournament_id: TournamentId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> SingleCourtResponse:
    existing_courts = await get_all_courts_in_tournament(tournament_id)
    check_requirement(existing_courts, user, "max_courts")

    display_order = await get_next_court_display_order(tournament_id)
    last_record_id = await database.execute(
        query=courts.insert(),
        values=CourtToInsert(
            **court_body.model_dump(),
            created=datetime_utc.now(),
            tournament_id=tournament_id,
            display_order=display_order,
        ).model_dump(),
    )
    return SingleCourtResponse(
        data=assert_some(
            await fetch_one_parsed(
                database,
                Court,
                courts.select().where(
                    courts.c.id == last_record_id and courts.c.tournament_id == tournament_id
                ),
            )
        )
    )
