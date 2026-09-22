from fastapi import APIRouter, Depends, HTTPException, Request
from starlette import status

from project.models.db.club import Club, ClubCreateBody, ClubUpdateBody
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated, firebase_user_optional
from project.routes.authorization import SCOREKEEPER_TOKEN_HEADER, require_club_owner
from project.routes.models import ClubResponse, ClubsResponse, SuccessResponse
from project.sql.clubs import create_club, get_clubs_for_user_id, sql_delete_club, sql_update_club
from project.utils.errors import ForeignKey, check_foreign_key_violation
from project.utils.id_types import ClubId, UserId

router = APIRouter()


@router.get("/clubs", response_model=ClubsResponse)
async def get_clubs(
    request: Request,
    user: UserPublic | None = Depends(firebase_user_optional),
) -> ClubsResponse:
    """Shared club directory. Requires login or a scorekeeper access token."""
    if user is None and not request.headers.get(SCOREKEEPER_TOKEN_HEADER):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    return ClubsResponse(
        data=await get_clubs_for_user_id(user.id if user is not None else UserId(0))
    )


@router.post("/clubs", response_model=ClubResponse)
async def create_new_club(
    club: ClubCreateBody, user: UserPublic = Depends(firebase_user_authenticated)
) -> ClubResponse:
    return ClubResponse(data=await create_club(club, user.id))


@router.delete("/clubs/{club_id}", response_model=SuccessResponse)
async def delete_club(
    club_id: ClubId,
    _: Club = Depends(require_club_owner),
) -> SuccessResponse:
    with check_foreign_key_violation({ForeignKey.tournaments_club_id_fkey}):
        await sql_delete_club(club_id)

    return SuccessResponse()


@router.put("/clubs/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: ClubId,
    club: ClubUpdateBody,
    _: Club = Depends(require_club_owner),
) -> ClubResponse:
    return ClubResponse(data=await sql_update_club(club_id, club))
