import json
from decimal import Decimal
from typing import cast

from heliclockter import datetime_utc

from project.database import database
from project.logic.ranking.statistics import START_ELO
from project.models.db.player import Player, PlayerBody, PlayerToInsert
from project.schema import players
from project.utils.id_types import PlayerId, TournamentId
from project.utils.pagination import PaginationPlayers
from project.utils.types import dict_without_none


async def get_all_players_in_tournament(
    tournament_id: TournamentId,
    *,
    not_in_team: bool = False,
) -> list[Player]:
    not_in_team_filter = "AND players.team_id IS NULL" if not_in_team else ""
    query = f"""
        SELECT
          id,
          tournament_id,
          created,
          wins,
          data,
          data ->> 'name'     AS name,
          data ->> 'rank'     AS rank,
          data ->> 'division' AS division,
          data ->> 'lunch'    AS lunch,
          (data ->> 'active')::boolean AS active,
          (data ->> 'paid')   ::boolean AS paid
        FROM players
        WHERE players.tournament_id = :tournament_id
        {not_in_team_filter}
        ORDER BY data ->> 'name'
        """

    result = await database.fetch_all(
        query=query,
        values=dict_without_none(
            {
                "tournament_id": tournament_id,
            }
        ),
    )

    return [
        Player.model_validate({ **dict(row), "data": json.loads(row["data"]) })
        for row in result
    ]


async def get_player_by_id(player_id: PlayerId, tournament_id: TournamentId) -> Player | None:
    query = """
        SELECT *
        FROM players
        WHERE id = :player_id
        AND tournament_id = :tournament_id
    """
    result = await database.fetch_one(
        query=query, values={"player_id": player_id, "tournament_id": tournament_id}
    )
    return Player.model_validate(result) if result is not None else None


async def get_player_count(
    tournament_id: TournamentId,
    *,
    not_in_team: bool = False,
) -> int:
    not_in_team_filter = "AND players.team_id IS NULL" if not_in_team else ""
    query = f"""
        SELECT count(*)
        FROM players
        WHERE players.tournament_id = :tournament_id
        {not_in_team_filter}
        """
    return cast(int, await database.fetch_val(query=query, values={"tournament_id": tournament_id}))


async def sql_delete_player(tournament_id: TournamentId, player_id: PlayerId) -> None:
    query = "DELETE FROM players WHERE id = :player_id AND tournament_id = :tournament_id"
    await database.fetch_one(
        query=query, values={"player_id": player_id, "tournament_id": tournament_id}
    )


async def sql_delete_players_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM players WHERE tournament_id = :tournament_id"
    await database.fetch_one(query=query, values={"tournament_id": tournament_id})


async def insert_player(player_body: PlayerBody, tournament_id: TournamentId) -> None:
    await database.execute(
        query=players.insert(),
        values=PlayerToInsert(
            **player_body.model_dump(),
            created=datetime_utc.now(),
            tournament_id=tournament_id,
        ).model_dump(),
    )
