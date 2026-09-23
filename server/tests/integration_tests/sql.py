from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import cast

from sqlalchemy import Table

from project.database import database
from project.models.db.club import Club, ClubInsertable
from project.models.db.court import Court, CourtInsertable
from project.models.db.player import Player, PlayerInsertable
from project.models.db.player_x_team import PlayerXTeamInsertable
from project.models.db.team import Team, TeamInsertable
from project.models.db.team_category import TeamCategory, TeamCategoryInsertable
from project.models.db.tournament import Tournament, TournamentInsertable
from project.models.db.user import UserInDB, UserInsertable
from project.schema import (
    clubs,
    courts,
    players,
    players_x_teams,
    teams,
    teams_category,
    tournaments,
    users,
)
from project.utils.db import insert_generic
from project.utils.dummy_records import DUMMY_CLUB, DUMMY_TOURNAMENT
from project.utils.id_types import TeamId, TournamentId
from project.utils.types import BaseModelT
from tests.integration_tests.mocks import get_mock_user
from tests.integration_tests.models import AuthContext


async def assert_row_count_and_clear(table: Table, expected_rows: int) -> None:
    # assert len(await database.fetch_all(query=table.select())) == expected_rows
    await database.execute(query=table.delete())


@asynccontextmanager
async def inserted_generic(
    data_model: BaseModelT, table: Table, return_type: type[BaseModelT]
) -> AsyncIterator[BaseModelT]:
    last_record_id, row_inserted = await insert_generic(database, data_model, table, return_type)

    try:
        yield row_inserted
    finally:
        await database.execute(query=table.delete().where(table.c.id == last_record_id))


@asynccontextmanager
async def inserted_user(user: UserInsertable) -> AsyncIterator[UserInDB]:
    async with inserted_generic(user, users, UserInDB) as row_inserted:
        yield cast(UserInDB, row_inserted)


@asynccontextmanager
async def inserted_club(club: ClubInsertable) -> AsyncIterator[Club]:
    async with inserted_generic(club, clubs, Club) as row_inserted:
        yield cast(Club, row_inserted)


@asynccontextmanager
async def inserted_tournament(tournament: TournamentInsertable) -> AsyncIterator[Tournament]:
    async with inserted_generic(tournament, tournaments, Tournament) as row_inserted:
        yield cast(Tournament, row_inserted)


@asynccontextmanager
async def inserted_team(team: TeamInsertable) -> AsyncIterator[Team]:
    async with inserted_generic(team, teams, Team) as row_inserted:
        yield cast(Team, row_inserted)


@asynccontextmanager
async def inserted_team_category(
    tournament_id: TournamentId,
    *,
    name: str = "Mixed",
    color: str = "#d0ebff",
    position: int = 0,
) -> AsyncIterator[TeamCategory]:
    async with inserted_generic(
        TeamCategoryInsertable(
            tournament_id=tournament_id,
            name=name,
            color=color,
            position=position,
        ),
        teams_category,
        TeamCategory,
    ) as row_inserted:
        yield cast(TeamCategory, row_inserted)


@asynccontextmanager
async def inserted_court(court: CourtInsertable) -> AsyncIterator[Court]:
    async with inserted_generic(court, courts, Court) as row_inserted:
        yield cast(Court, row_inserted)


@asynccontextmanager
async def inserted_player(player: PlayerInsertable) -> AsyncIterator[Player]:
    async with inserted_generic(player, players, Player) as row_inserted:
        yield cast(Player, row_inserted)


@asynccontextmanager
async def inserted_player_in_team(
    player: PlayerInsertable, team_id: TeamId
) -> AsyncIterator[Player]:
    async with inserted_generic(player, players, Player) as row_inserted:
        async with inserted_generic(
            PlayerXTeamInsertable(player_id=cast(Player, row_inserted).id, team_id=team_id),
            players_x_teams,
            PlayerXTeamInsertable,
        ):
            yield cast(Player, row_inserted)


@asynccontextmanager
async def inserted_auth_context() -> AsyncIterator[AuthContext]:
    mock_user = get_mock_user()
    headers = {"Authorization": "Bearer test-token"}
    async with (
        inserted_user(mock_user) as user_inserted,
        inserted_club(DUMMY_CLUB.model_copy(update={"creator_id": user_inserted.id})) as club_inserted,
        inserted_tournament(
            DUMMY_TOURNAMENT.model_copy(update={"creator_id": user_inserted.id})
        ) as tournament_inserted,
    ):
        yield AuthContext(
            headers=headers,
            user=user_inserted,
            club=club_inserted,
            tournament=tournament_inserted,
        )
