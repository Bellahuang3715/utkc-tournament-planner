from fastapi import APIRouter, Depends

from project.models.db.club import ClubCreateBody, ClubUpdateBody
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import ClubResponse, ClubsResponse, SuccessResponse
from project.sql.clubs import create_club, get_clubs_for_user_id, sql_delete_club, sql_update_club
from project.utils.errors import ForeignKey, check_foreign_key_violation
from project.utils.id_types import ClubId

router = APIRouter()


@router.get("/clubs", response_model=ClubsResponse)
async def get_clubs(user: UserPublic = Depends(firebase_user_authenticated)) -> ClubsResponse:
    return ClubsResponse(data=await get_clubs_for_user_id(user.id))


@router.post("/clubs", response_model=ClubResponse)
async def create_new_club(club: ClubCreateBody, user: UserPublic = Depends(firebase_user_authenticated)) -> ClubResponse:
    return ClubResponse(data=await create_club(club, user.id))


@router.delete("/clubs/{club_id}", response_model=SuccessResponse)
async def delete_club(
    club_id: ClubId, _: UserPublic = Depends(firebase_user_authenticated)
) -> SuccessResponse:
    with check_foreign_key_violation({ForeignKey.tournaments_club_id_fkey}):
        await sql_delete_club(club_id)

    return SuccessResponse()


@router.put("/clubs/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: ClubId, club: ClubUpdateBody, _: UserPublic = Depends(firebase_user_authenticated)
) -> ClubResponse:
    return ClubResponse(data=await sql_update_club(club_id, club))
