"""Scorekeeper access: redeem shareable codes."""

from fastapi import APIRouter, HTTPException
from starlette import status

from project.models.db.tournament import ScorekeeperRedeemBody, ScorekeeperRedeemResult
from project.routes.models import ScorekeeperRedeemResponse
from project.sql.tournaments import sql_get_tournament_by_scorekeeper_token

router = APIRouter()


@router.post("/scorekeeping/redeem", response_model=ScorekeeperRedeemResponse)
async def redeem_scorekeeper_token(
    body: ScorekeeperRedeemBody,
) -> ScorekeeperRedeemResponse:
    token = body.token.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access code is required",
        )

    tournament = await sql_get_tournament_by_scorekeeper_token(token)
    if tournament is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid scorekeeper access code",
        )

    return ScorekeeperRedeemResponse(
        data=ScorekeeperRedeemResult(
            tournament_id=tournament.id,
            name=tournament.name,
            role="scorekeeper",
        )
    )
