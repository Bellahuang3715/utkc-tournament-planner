from fastapi import APIRouter, Depends, HTTPException, Request
from starlette import status

from project.models.db.account import UserAccountType
from project.models.db.club import Club, ClubCreateBody, ClubUpdateBody
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated, firebase_user_optional
from project.routes.authorization import SCOREKEEPER_TOKEN_HEADER, require_club_owner
from project.routes.models import ClubResponse, ClubsResponse, SuccessResponse
from project.sql.clubs import (
    ClubTournamentUsage,
    create_club,
    get_all_clubs,
    get_clubs_owned_by_user_id,
    sql_delete_club,
    sql_get_club_tournament_usage,
    sql_update_club,
)
from project.sql.tournaments import sql_get_tournament_by_scorekeeper_token
from project.utils.id_types import ClubId

router = APIRouter()


def _club_in_use_detail(club_name: str, usage: list[ClubTournamentUsage]) -> str:
    tournament_names = ", ".join(item.name for item in usage)
    players = sum(item.player_count for item in usage)
    teams = sum(item.team_count for item in usage)
    parts: list[str] = []
    if players:
        parts.append(f"{players} player{'s' if players != 1 else ''}")
    if teams:
        parts.append(f"{teams} team{'s' if teams != 1 else ''}")
    counts = f" ({', '.join(parts)})" if parts else ""
    return f'Can\'t delete "{club_name}". Still used in: {tournament_names}{counts}.'


@router.get("/clubs", response_model=ClubsResponse)
async def get_clubs(
    request: Request,
    user: UserPublic | None = Depends(firebase_user_optional),
) -> ClubsResponse:
    """Clubs owned by the logged-in user.

    A scorekeeper token returns the tournament creator's clubs, so scoring
    pages can resolve club names without owning those rows.
    """
    token = request.headers.get(SCOREKEEPER_TOKEN_HEADER)
    if token:
        tournament = await sql_get_tournament_by_scorekeeper_token(token)
        if tournament is not None:
            return ClubsResponse(data=await get_clubs_owned_by_user_id(tournament.creator_id))

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    if user.account_type == UserAccountType.ADMIN:
        return ClubsResponse(data=await get_all_clubs())
    return ClubsResponse(data=await get_clubs_owned_by_user_id(user.id))


@router.post("/clubs", response_model=ClubResponse)
async def create_new_club(
    club: ClubCreateBody, user: UserPublic = Depends(firebase_user_authenticated)
) -> ClubResponse:
    return ClubResponse(data=await create_club(club, user.id))


@router.delete("/clubs/{club_id}", response_model=SuccessResponse)
async def delete_club(
    club_id: ClubId,
    club: Club = Depends(require_club_owner),
) -> SuccessResponse:
    usage = await sql_get_club_tournament_usage(club_id)
    if usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_club_in_use_detail(club.name, usage),
        )

    await sql_delete_club(club_id)
    return SuccessResponse()


@router.put("/clubs/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: ClubId,
    club: ClubUpdateBody,
    _: Club = Depends(require_club_owner),
) -> ClubResponse:
    return ClubResponse(data=await sql_update_club(club_id, club))
