import os
from uuid import uuid4

import aiofiles.os
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from starlette import status

from project.database import database
from project.logic.dashboard_access import (
    can_access_participant_dashboard,
    new_dashboard_preview_token,
    new_scorekeeper_token,
    slugify_dashboard_endpoint,
    to_public_tournament,
)
from project.logic.planning.matches import update_start_times_of_matches
from project.logic.tournaments import get_tournament_logo_path
from project.models.db.account import UserAccountType
from project.models.db.ranking import RankingCreateBody
from project.models.db.tournament import (
    Tournament,
    TournamentBody,
    TournamentUpdateBody,
)
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.authorization import (
    require_tournament_owner,
    require_tournament_score_access,
)
from project.routes.models import (
    DashboardPreviewTokenResponse,
    ScorekeeperTokenResponse,
    SuccessResponse,
    TournamentPublicResponse,
    TournamentResponse,
    TournamentsResponse,
)
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
    sql_set_dashboard_preview_token,
    sql_set_scorekeeper_token,
    sql_update_tournament,
)
from project.utils.errors import (
    ForeignKey,
    UniqueIndex,
    check_foreign_key_violation,
    check_unique_constraint_violation,
)
from project.utils.id_types import TournamentId
from project.utils.logging import logger

router = APIRouter()
forbidden_dashboard_exception = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="This participant site is not published",
)


@router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(
    tournament_id: TournamentId,
    tournament: Tournament = Depends(require_tournament_score_access),
) -> TournamentResponse:
    return TournamentResponse(data=tournament)


@router.get("/tournaments", response_model=TournamentsResponse)
async def get_tournaments(
    user: UserPublic = Depends(firebase_user_authenticated),
    endpoint_name: str | None = None,
) -> TournamentsResponse:
    if endpoint_name is not None:
        tournament = await sql_get_tournament_by_endpoint_name(endpoint_name)
        if tournament is None or not (
            user.account_type == UserAccountType.ADMIN
            or tournament.creator_id == user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Can't find this tournament",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return TournamentsResponse(data=[tournament])

    if user.account_type == UserAccountType.ADMIN:
        return TournamentsResponse(data=await sql_get_tournaments())

    return TournamentsResponse(data=await sql_get_tournaments(creator_id=user.id))


@router.get(
    "/public/tournaments/{endpoint_name}",
    response_model=TournamentPublicResponse,
)
async def get_public_tournament_by_endpoint(
    endpoint_name: str,
    preview: str | None = None,
) -> TournamentPublicResponse:
    """Participant site lookup by dashboard slug. Public or valid preview token."""
    tournament = await sql_get_tournament_by_endpoint_name(endpoint_name)
    if tournament is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found")

    if not can_access_participant_dashboard(tournament, preview_token=preview):
        raise forbidden_dashboard_exception

    return TournamentPublicResponse(data=to_public_tournament(tournament))


@router.put("/tournaments/{tournament_id}", response_model=SuccessResponse)
async def update_tournament_by_id(
    tournament_id: TournamentId,
    tournament_body: TournamentUpdateBody,
    _: Tournament = Depends(require_tournament_owner),
) -> SuccessResponse:
    with check_unique_constraint_violation({UniqueIndex.ix_tournaments_dashboard_endpoint}):
        await sql_update_tournament(tournament_id, tournament_body)

    await update_start_times_of_matches(tournament_id)
    return SuccessResponse()


@router.post(
    "/tournaments/{tournament_id}/dashboard_preview_token",
    response_model=DashboardPreviewTokenResponse,
)
async def rotate_dashboard_preview_token(
    tournament_id: TournamentId,
    _: Tournament = Depends(require_tournament_owner),
) -> DashboardPreviewTokenResponse:
    """Create or rotate the secret preview link token (invalidates previous preview URLs)."""
    token = new_dashboard_preview_token()
    await sql_set_dashboard_preview_token(tournament_id, token)
    return DashboardPreviewTokenResponse(dashboard_preview_token=token)


@router.get(
    "/tournaments/{tournament_id}/scorekeeper-token",
    response_model=ScorekeeperTokenResponse,
)
async def get_scorekeeper_token(
    tournament: Tournament = Depends(require_tournament_owner),
) -> ScorekeeperTokenResponse:
    if not tournament.scorekeeper_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No scorekeeper access code yet",
        )
    return ScorekeeperTokenResponse(scorekeeper_token=tournament.scorekeeper_token)


@router.post(
    "/tournaments/{tournament_id}/scorekeeper-token",
    response_model=ScorekeeperTokenResponse,
)
async def rotate_scorekeeper_token(
    tournament_id: TournamentId,
    _: Tournament = Depends(require_tournament_owner),
) -> ScorekeeperTokenResponse:
    """Create or rotate the shareable scorekeeper access code."""
    token = new_scorekeeper_token()
    await sql_set_scorekeeper_token(tournament_id, token)
    return ScorekeeperTokenResponse(scorekeeper_token=token)


@router.delete(
    "/tournaments/{tournament_id}/scorekeeper-token",
    response_model=SuccessResponse,
)
async def clear_scorekeeper_token(
    tournament_id: TournamentId,
    _: Tournament = Depends(require_tournament_owner),
) -> SuccessResponse:
    """Disable the shareable code (existing memberships remain)."""
    await sql_set_scorekeeper_token(tournament_id, None)
    return SuccessResponse()


@router.delete("/tournaments/{tournament_id}", response_model=SuccessResponse)
async def delete_tournament(
    tournament_id: TournamentId,
    _: Tournament = Depends(require_tournament_owner),
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
    tournament_to_insert: TournamentBody,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    # Default unpublished; always issue a preview token. Slug from name when missing.
    body = tournament_to_insert.model_copy(deep=True)
    if not body.dashboard_endpoint:
        base = slugify_dashboard_endpoint(body.name)
        candidate = base
        suffix = 2
        while await sql_get_tournament_by_endpoint_name(candidate) is not None:
            candidate = f"{base}-{suffix}"
            suffix += 1
        body.dashboard_endpoint = candidate

    preview_token = new_dashboard_preview_token()

    async with database.transaction():
        with check_unique_constraint_violation({UniqueIndex.ix_tournaments_dashboard_endpoint}):
            tournament_id = await sql_create_tournament(
                body,
                creator_id=user.id,
                dashboard_preview_token=preview_token,
            )

        ranking = RankingCreateBody()
        await sql_create_ranking(tournament_id, ranking, position=0)

    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/logo")
async def upload_logo(
    tournament_id: TournamentId,
    file: UploadFile | None = None,
    _: Tournament = Depends(require_tournament_owner),
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
