from fastapi import APIRouter, Depends

from project.database import database
from project.logic.subscriptions import check_requirement
from project.models.db.player import Player, PlayerBody, PlayerMultiBody
from project.models.db.user import UserPublic
from project.routes.auth import firebase_user_authenticated
from project.routes.models import (
    PaginatedPlayers,
    PlayersResponse,
    SinglePlayerResponse,
    SuccessResponse,
)
from project.schema import players
from project.sql.players import (
    get_all_players_in_tournament,
    get_player_count,
    insert_player,
    sql_delete_player,
)
from project.utils.db import fetch_one_parsed
from project.utils.id_types import PlayerId, TournamentId
from project.utils.types import assert_some

router = APIRouter()


@router.get("/tournaments/{tournament_id}/players", response_model=PlayersResponse)
async def get_players(
    tournament_id: TournamentId,
    not_in_team: bool = False,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> PlayersResponse:
    return PlayersResponse(
        data=PaginatedPlayers(
            players=await get_all_players_in_tournament(
                tournament_id, not_in_team=not_in_team
            ),
            count=await get_player_count(tournament_id, not_in_team=not_in_team),
        )
    )


@router.put("/tournaments/{tournament_id}/players/{player_id}", response_model=SinglePlayerResponse)
async def update_player_by_id(
    tournament_id: TournamentId,
    player_id: PlayerId,
    player_body: PlayerBody,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SinglePlayerResponse:
    await database.execute(
        query=players.update().where(
            (players.c.id == player_id) & (players.c.tournament_id == tournament_id)
        ),
        values=player_body.model_dump(),
    )
    return SinglePlayerResponse(
        data=assert_some(
            await fetch_one_parsed(
                database,
                Player,
                players.select().where(
                    (players.c.id == player_id) & (players.c.tournament_id == tournament_id)
                ),
            )
        )
    )


@router.delete("/tournaments/{tournament_id}/players/{player_id}", response_model=SuccessResponse)
async def delete_player(
    tournament_id: TournamentId,
    player_id: PlayerId,
    _: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    await sql_delete_player(tournament_id, player_id)
    return SuccessResponse()


@router.post("/tournaments/{tournament_id}/players", response_model=SuccessResponse)
async def create_single_player(
    player_body: PlayerBody,
    tournament_id: TournamentId,
    user: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    existing_players = await get_all_players_in_tournament(tournament_id)
    check_requirement(existing_players, user, "max_players")
    await insert_player(player_body, tournament_id)
    return SuccessResponse()
