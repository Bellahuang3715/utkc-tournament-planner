import os
from uuid import uuid4

import aiofiles.os
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from starlette import status

from project.database import database
from project.logic.planning.matches import update_start_times_of_matches
from project.logic.subscriptions import check_requirement
from project.logic.tournaments import get_tournament_logo_path
from project.models.db.ranking import RankingCreateBody
from project.models.db.tournament import (
    TournamentBody,
    TournamentUpdateBody,
)
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import SuccessResponse, TournamentResponse, TournamentsResponse
from project.schema import tournaments
from project.sql.rankings import (
    get_all_rankings_in_tournament,
    sql_create_ranking,
    sql_delete_ranking,
)
from project.sql.tournaments import (
    sql_create_tournament,
    sql_delete_tournament,
    sql_get_tournament,
    sql_get_tournament_by_endpoint_name,
    sql_get_tournaments,
    sql_update_tournament,
)
from project.sql.users import get_user_access_to_club, get_which_clubs_has_user_access_to
from project.utils.errors import (
    ForeignKey,
    UniqueIndex,
    check_foreign_key_violation,
    check_unique_constraint_violation,
)
from project.utils.id_types import TournamentId
from project.utils.logging import logger

router = APIRouter()
unauthorized_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="You don't have access to this tournament",
    headers={"WWW-Authenticate": "Bearer"},
)


@router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: TournamentId,
    user: UserPublic | None = Depends(firebase_user_authenticated),
) -> TournamentResponse:
    tournament = await sql_get_tournament(tournament_id)
    if user is None and not tournament.dashboard_public:
        raise unauthorized_exception

    return TournamentResponse(data=tournament)


@router.get("/tournaments", response_model=TournamentsResponse)
async def get_tournaments(
    user: UserPublic | None = Depends(firebase_user_authenticated),
    endpoint_name: str | None = None,
) -> TournamentsResponse:
    match user, endpoint_name:
        case None, None:
            raise unauthorized_exception

        case _, str(endpoint_name):
            tournament = await sql_get_tournament_by_endpoint_name(endpoint_name)
            if tournament is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Can't find this tournament",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return TournamentsResponse(data=[tournament])

        case _, _ if isinstance(user, UserPublic):
            return TournamentsResponse(
                data=await sql_get_tournaments(endpoint_name)
            )

    raise RuntimeError()


@router.put("/tournaments/{tournament_id}", response_model=SuccessResponse)
async def update_tournament_by_id(
    tournament_id: TournamentId,
    tournament_body: TournamentUpdateBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    with check_unique_constraint_violation({UniqueIndex.ix_tournaments_dashboard_endpoint}):
        await sql_update_tournament(tournament_id, tournament_body)

    await update_start_times_of_matches(tournament_id)
    return SuccessResponse()


@router.delete("/tournaments/{tournament_id}", response_model=SuccessResponse)
async def delete_tournament(
    tournament_id: TournamentId, _: UserPublic = Depends(firebase_user_authenticated)
) -> SuccessResponse:
    for ranking in await get_all_rankings_in_tournament(tournament_id):
        await sql_delete_ranking(tournament_id, ranking.id)

    with check_foreign_key_violation(
        {
            ForeignKey.stages_tournament_id_fkey,
            ForeignKey.teams_tournament_id_fkey,
            ForeignKey.players_tournament_id_fkey,
            ForeignKey.courts_tournament_id_fkey,
        }
    ):
        await sql_delete_tournament(tournament_id)

    return SuccessResponse()


@router.post("/tournaments", response_model=SuccessResponse)
async def create_tournament(
    tournament_to_insert: TournamentBody, user: UserPublic = Depends(firebase_user_authenticated)
) -> SuccessResponse:
    existing_tournaments = await sql_get_tournaments((tournament_to_insert.club_id,))
    check_requirement(existing_tournaments, user, "max_tournaments")

    has_access_to_club = await get_user_access_to_club(tournament_to_insert.club_id, user.id)
    if not has_access_to_club:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Club ID is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    async with database.transaction():
        with check_unique_constraint_violation({UniqueIndex.ix_tournaments_dashboard_endpoint}):
            tournament_id = await sql_create_tournament(tournament_to_insert)

        ranking = RankingCreateBody()
        await sql_create_ranking(tournament_id, ranking, position=0)

    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/logo")
async def upload_logo(
    tournament_id: TournamentId,
    file: UploadFile | None = None,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> TournamentResponse:
    old_logo_path = await get_tournament_logo_path(tournament_id)
    filename: str | None = None
    new_logo_path: str | None = None

    if file:
        assert file.filename is not None
        extension = os.path.splitext(file.filename)[1]
        assert extension in (".png", ".jpg", ".jpeg")

        filename = f"{uuid4()}{extension}"
        new_logo_path = f"static/tournament-logos/{filename}" if file is not None else None

        if new_logo_path:
            await aiofiles.os.makedirs("static/tournament-logos", exist_ok=True)
            async with aiofiles.open(new_logo_path, "wb") as f:
                await f.write(await file.read())

    if old_logo_path is not None and old_logo_path != new_logo_path:
        try:
            await aiofiles.os.remove(old_logo_path)
        except Exception as exc:
            logger.error(f"Could not remove logo that should still exist: {old_logo_path}\n{exc}")

    await database.execute(
        tournaments.update().where(tournaments.c.id == tournament_id),
        values={"logo_path": filename},
    )
    return TournamentResponse(data=await sql_get_tournament(tournament_id))
