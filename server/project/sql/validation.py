from collections.abc import Awaitable, Callable
from typing import Any, NoReturn, get_args

from fastapi import HTTPException
from pydantic import BaseModel
from starlette import status

from project.database import database
from project.sql.courts import get_all_courts_in_tournament
from project.sql.players import get_all_players_in_tournament, get_player_by_id
from project.sql.teams import get_team_by_id
from project.utils.id_types import (
    CourtId,
    PlayerId,
    TeamCategoryId,
    TeamId,
    TournamentId,
)

CheckCallableT = Callable[[Any, TournamentId], Awaitable[bool]]


async def check_team_belongs_to_tournament(team_id: TeamId, tournament_id: TournamentId) -> bool:
    return await get_team_by_id(team_id, tournament_id) is not None


async def check_player_belongs_to_tournament(
    player_id: PlayerId, tournament_id: TournamentId
) -> bool:
    return await get_player_by_id(player_id, tournament_id) is not None


async def check_players_belong_to_tournament(
    player_ids: set[PlayerId], tournament_id: TournamentId
) -> bool:
    return player_ids.issubset(
        player.id for player in await get_all_players_in_tournament(tournament_id)
    )


async def check_court_belongs_to_tournament(
    court_id: CourtId, tournament_id: TournamentId
) -> bool:
    return any(court_id == court.id for court in await get_all_courts_in_tournament(tournament_id))


async def check_team_category_belongs_to_tournament(
    category_id: TeamCategoryId, tournament_id: TournamentId
) -> bool:
    row = await database.fetch_one(
        """
        SELECT 1 FROM teams_category
        WHERE id = :id AND tournament_id = :tid
        """,
        {"id": category_id, "tid": tournament_id},
    )
    return row is not None


def raise_exception(field_type: Any, field_value: Any) -> NoReturn:
    field_name = field_type.__name__ if field_type is not None else "Unknown type"
    msg = f"Could not find {field_name.replace('Id', '')}(s) with ID {field_value}"
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


async def check_foreign_keys_belong_to_tournament(
    some_body: BaseModel, tournament_id: TournamentId
) -> None:
    """
    Inspects the types of BaseModel attributes, and based on that checks whether that attribute
    is indeed part of the tournament. This prohibits e.g. adding players from another tournament to
    a certain team.
    """
    check_lookup: dict[type[Any], CheckCallableT] = {
        TeamId: check_team_belongs_to_tournament,
        TeamCategoryId: check_team_category_belongs_to_tournament,
        PlayerId: check_player_belongs_to_tournament,
        CourtId: check_court_belongs_to_tournament,
    }

    for field_key, field_info in some_body.model_fields.items():
        field_value = getattr(some_body, field_key)
        if field_value is None:
            continue

        if isinstance(field_value, BaseModel):
            await check_foreign_keys_belong_to_tournament(field_value, tournament_id)
        elif isinstance(field_value, set):
            if field_info.annotation == set[PlayerId]:
                if not await check_players_belong_to_tournament(field_value, tournament_id):
                    raise_exception(PlayerId, field_value)
            else:
                raise Exception(f"Unknown set type: {field_info.annotation}")
        elif isinstance(field_value, list):
            if get_args(field_info.annotation) and get_args(field_info.annotation)[0] == PlayerId:
                if not await check_players_belong_to_tournament(set(field_value), tournament_id):
                    raise_exception(PlayerId, field_value)
        else:
            possible_types = [field_info.annotation, *get_args(field_info.annotation)]
            for possible_type in possible_types:
                check_callable = check_lookup.get(possible_type)
                if check_callable is not None and not await check_callable(
                    field_value, tournament_id
                ):
                    raise_exception(possible_type, field_value)
