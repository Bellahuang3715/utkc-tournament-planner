"""Ownership and scorekeeper access checks for tournaments / clubs."""

from hmac import compare_digest

from fastapi import Depends, HTTPException, Request
from starlette import status

from project.models.db.account import UserAccountType
from project.models.db.club import Club
from project.models.db.division import Division
from project.models.db.tournament import Tournament, TournamentRole
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated, firebase_user_optional
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

SCOREKEEPER_TOKEN_HEADER = "X-Scorekeeper-Token"


def user_owns_tournament(user: UserPublic, tournament: Tournament) -> bool:
    if user.account_type == UserAccountType.ADMIN:
        return True
    return tournament.creator_id == user.id


def user_owns_club(user: UserPublic, club: Club) -> bool:
    if user.account_type == UserAccountType.ADMIN:
        return True
    return club.creator_id == user.id


def _scorekeeper_token_matches(tournament: Tournament, token: str | None) -> bool:
    if not token or not tournament.scorekeeper_token:
        return False
    return compare_digest(token, tournament.scorekeeper_token)


def strip_tournament_secrets(tournament: Tournament) -> Tournament:
    """Remove tokens that must not leave owner-only responses."""
    tournament.scorekeeper_token = None
    tournament.dashboard_preview_token = None
    return tournament


def resolve_tournament_role(
    tournament: Tournament,
    *,
    user: UserPublic | None,
    scorekeeper_token: str | None,
) -> TournamentRole | None:
    if user is not None and user_owns_tournament(user, tournament):
        return "organizer"
    if _scorekeeper_token_matches(tournament, scorekeeper_token):
        return "scorekeeper"
    return None


async def assert_user_owns_tournament(
    user: UserPublic, tournament_id: TournamentId
) -> Tournament:
    tournament = await sql_get_tournament(tournament_id)
    if not user_owns_tournament(user, tournament):
        raise forbidden_exception
    return tournament


def assert_tournament_score_access(
    tournament: Tournament,
    *,
    user: UserPublic | None,
    scorekeeper_token: str | None,
) -> TournamentRole:
    role = resolve_tournament_role(
        tournament, user=user, scorekeeper_token=scorekeeper_token
    )
    if role is None:
        raise forbidden_exception
    return role


async def require_tournament_owner(
    tournament_id: TournamentId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> Tournament:
    """FastAPI dependency: authenticated user must own the path tournament."""
    return await assert_user_owns_tournament(user, tournament_id)


async def require_tournament_score_access(
    tournament_id: TournamentId,
    request: Request,
    user: UserPublic | None = Depends(firebase_user_optional),
) -> Tournament:
    """Owner or valid scorekeeper token."""
    tournament = await sql_get_tournament(tournament_id)
    token = request.headers.get(SCOREKEEPER_TOKEN_HEADER)
    role = assert_tournament_score_access(
        tournament, user=user, scorekeeper_token=token
    )
    if role != "organizer":
        strip_tournament_secrets(tournament)
    tournament.my_role = role
    return tournament


async def require_division_owner(
    division_id: DivisionId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> Division:
    division = await sql_get_division(division_id)
    if division is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Division not found")
    await assert_user_owns_tournament(user, division.tournament_id)
    return division


async def require_division_score_access(
    division_id: DivisionId,
    request: Request,
    user: UserPublic | None = Depends(firebase_user_optional),
) -> Division:
    division = await sql_get_division(division_id)
    if division is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Division not found")
    tournament = await sql_get_tournament(division.tournament_id)
    token = request.headers.get(SCOREKEEPER_TOKEN_HEADER)
    assert_tournament_score_access(
        tournament, user=user, scorekeeper_token=token
    )
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


async def require_bracket_score_access(
    bracket_id: BracketId,
    request: Request,
    user: UserPublic | None = Depends(firebase_user_optional),
) -> TournamentId:
    tournament_id = await sql_get_tournament_id_for_bracket(bracket_id)
    if tournament_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bracket not found")
    tournament = await sql_get_tournament(tournament_id)
    token = request.headers.get(SCOREKEEPER_TOKEN_HEADER)
    assert_tournament_score_access(
        tournament, user=user, scorekeeper_token=token
    )
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
