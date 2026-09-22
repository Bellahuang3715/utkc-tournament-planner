"""Ownership checks for multi-user tournament / club access."""

from fastapi import Depends, HTTPException
from starlette import status

from project.models.db.account import UserAccountType
from project.models.db.club import Club
from project.models.db.division import Division
from project.models.db.tournament import Tournament
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.sql.clubs import sql_get_club
from project.sql.divisions import sql_get_division
from project.sql.tournaments import (
    sql_get_tournament,
    sql_get_tournament_id_for_bracket,
)
from project.utils.id_types import BracketId, ClubId, DivisionId, TournamentId

forbidden_exception = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="You don't have access to this resource",
)


def user_owns_tournament(user: UserPublic, tournament: Tournament) -> bool:
    if user.account_type == UserAccountType.ADMIN:
        return True
    return tournament.creator_id == user.id


def user_owns_club(user: UserPublic, club: Club) -> bool:
    if user.account_type == UserAccountType.ADMIN:
        return True
    return club.creator_id == user.id


async def assert_user_owns_tournament(
    user: UserPublic, tournament_id: TournamentId
) -> Tournament:
    tournament = await sql_get_tournament(tournament_id)
    if not user_owns_tournament(user, tournament):
        raise forbidden_exception
    return tournament


async def require_tournament_owner(
    tournament_id: TournamentId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> Tournament:
    """FastAPI dependency: authenticated user must own the path tournament."""
    return await assert_user_owns_tournament(user, tournament_id)


async def require_division_owner(
    division_id: DivisionId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> Division:
    division = await sql_get_division(division_id)
    if division is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Division not found")
    await assert_user_owns_tournament(user, division.tournament_id)
    return division


async def require_bracket_owner(
    bracket_id: BracketId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> TournamentId:
    tournament_id = await sql_get_tournament_id_for_bracket(bracket_id)
    if tournament_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bracket not found")
    await assert_user_owns_tournament(user, tournament_id)
    return tournament_id


async def require_club_owner(
    club_id: ClubId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> Club:
    club = await sql_get_club(club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    if not user_owns_club(user, club):
        raise forbidden_exception
    return club
