from typing import TYPE_CHECKING, Any, TypeVar

from heliclockter import datetime_utc

from project.config import Environment, config, environment
from project.database import database, engine
from project.models.db.account import UserAccountType
from project.models.db.club import ClubInsertable
from project.models.db.court import CourtInsertable
from project.models.db.player import PlayerInsertable
from project.models.db.player_x_team import PlayerXTeamInsertable
from project.models.db.team import TeamInsertable
from project.models.db.team_category import TeamCategoryInsertable
from project.models.db.tournament import TournamentInsertable
from project.models.db.user import UserInsertable
from project.schema import (
    clubs,
    courts,
    metadata,
    players,
    players_x_teams,
    teams,
    teams_category,
    tournaments,
    users,
)
from project.sql.users import create_user, get_user
from project.utils.alembic import alembic_stamp_head
from project.utils.db import insert_generic
from project.utils.dummy_records import (
    DUMMY_TEAM_CATEGORY_MIXED,
    DUMMY_TEAM_CATEGORY_WOMENS,
    DUMMY_CLUB,
    DUMMY_COURT1,
    DUMMY_COURT2,
    DUMMY_PLAYER1,
    DUMMY_PLAYER2,
    DUMMY_PLAYER3,
    DUMMY_PLAYER4,
    DUMMY_PLAYER5,
    DUMMY_PLAYER6,
    DUMMY_PLAYER7,
    DUMMY_PLAYER8,
    DUMMY_PLAYER_X_TEAM,
    DUMMY_TEAM1,
    DUMMY_TEAM2,
    DUMMY_TEAM3,
    DUMMY_TEAM4,
    DUMMY_TOURNAMENT,
    DUMMY_USER,
)
from project.utils.id_types import (
    ClubId,
    CourtId,
    PlayerId,
    PlayerXTeamId,
    TeamCategoryId,
    TeamId,
    TournamentId,
    UserId,
)
from project.utils.logging import logger
from project.utils.security import hash_password
from project.utils.types import BaseModelT

if TYPE_CHECKING:
    from sqlalchemy import Table

T = TypeVar("T", bound=int)


async def create_admin_user() -> UserId:
    assert config.admin_email
    assert config.admin_password

    user = await create_user(
        UserInsertable(
            name="Admin",
            email=config.admin_email,
            password_hash=hash_password(config.admin_password),
            created=datetime_utc.now(),
            account_type=UserAccountType.REGULAR,
        )
    )
    return user.id


async def init_db_when_empty() -> UserId | None:
    table_count = await database.fetch_val(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    )
    if config.admin_email and config.admin_password:
        if (table_count <= 1 and environment != Environment.CI) or (
            environment is Environment.DEVELOPMENT and await get_user(config.admin_email) is None
        ):
            logger.warning("Empty db detected, creating tables...")
            metadata.create_all(engine)
            alembic_stamp_head()

            logger.warning("Empty db detected, creating admin user...")
            return await create_admin_user()

    return None


async def sql_create_dev_db() -> UserId:
    # TODO: refactor into smaller functions
    # pylint: disable=too-many-statements
    assert environment is not Environment.PRODUCTION

    logger.warning("Initializing database with dummy records")
    await database.connect()
    metadata.drop_all(engine)
    metadata.create_all(engine)
    await init_db_when_empty()
    alembic_stamp_head()

    table_lookup: dict[type, Table] = {
        UserInsertable: users,
        ClubInsertable: clubs,
        TeamCategoryInsertable: teams_category,
        TeamInsertable: teams,
        PlayerXTeamInsertable: players_x_teams,
        PlayerInsertable: players,
        TournamentInsertable: tournaments,
        CourtInsertable: courts,
    }

    async def insert_dummy(
        obj_to_insert: BaseModelT, id_type: type[T], update_data: dict[str, Any] = {}
    ) -> T:
        record_id, _ = await insert_generic(
            database,
            obj_to_insert.model_copy(update=update_data),
            table_lookup[type(obj_to_insert)],
            type(obj_to_insert),
        )
        return id_type(record_id)

    user_id_1 = await insert_dummy(DUMMY_USER, UserId)
    tournament_id_1 = await insert_dummy(
        DUMMY_TOURNAMENT, TournamentId, {"creator_id": user_id_1}
    )
    club_id_1 = await insert_dummy(DUMMY_CLUB, ClubId, {"creator_id": user_id_1})

    team_cat_mixed_id = await insert_dummy(
        DUMMY_TEAM_CATEGORY_MIXED,
        TeamCategoryId,
        {"tournament_id": tournament_id_1},
    )
    team_cat_womens_id = await insert_dummy(
        DUMMY_TEAM_CATEGORY_WOMENS,
        TeamCategoryId,
        {"tournament_id": tournament_id_1},
    )

    team_id_1 = await insert_dummy(
        DUMMY_TEAM1,
        TeamId,
        {"tournament_id": tournament_id_1, "club_id": club_id_1, "category_id": team_cat_mixed_id},
    )
    team_id_2 = await insert_dummy(
        DUMMY_TEAM2,
        TeamId,
        {"tournament_id": tournament_id_1, "club_id": club_id_1, "category_id": team_cat_mixed_id},
    )
    team_id_3 = await insert_dummy(
        DUMMY_TEAM3,
        TeamId,
        {"tournament_id": tournament_id_1, "club_id": club_id_1, "category_id": team_cat_mixed_id},
    )
    team_id_4 = await insert_dummy(
        DUMMY_TEAM4,
        TeamId,
        {"tournament_id": tournament_id_1, "club_id": club_id_1, "category_id": team_cat_mixed_id},
    )
    team_id_5 = await insert_dummy(
        DUMMY_TEAM4,
        TeamId,
        {
            "code": "UOT B",
            "category_id": team_cat_womens_id,
            "tournament_id": tournament_id_1,
            "club_id": club_id_1,
        },
    )
    team_id_6 = await insert_dummy(
        DUMMY_TEAM4,
        TeamId,
        {
            "code": "UOT B",
            "category_id": team_cat_womens_id,
            "tournament_id": tournament_id_1,
            "club_id": club_id_1,
        },
    )
    team_id_7 = await insert_dummy(
        DUMMY_TEAM4,
        TeamId,
        {
            "code": "UOT B",
            "category_id": team_cat_womens_id,
            "tournament_id": tournament_id_1,
            "club_id": club_id_1,
        },
    )
    team_id_8 = await insert_dummy(
        DUMMY_TEAM4,
        TeamId,
        {
            "code": "UOT B",
            "category_id": team_cat_womens_id,
            "tournament_id": tournament_id_1,
            "club_id": club_id_1,
        },
    )

    player_id_1 = await insert_dummy(DUMMY_PLAYER1, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER1.data})
    player_id_2 = await insert_dummy(DUMMY_PLAYER2, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER2.data})
    player_id_3 = await insert_dummy(DUMMY_PLAYER3, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER3.data})
    player_id_4 = await insert_dummy(DUMMY_PLAYER4, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER4.data})
    player_id_5 = await insert_dummy(DUMMY_PLAYER5, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER5.data})
    player_id_6 = await insert_dummy(DUMMY_PLAYER6, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER6.data})
    player_id_7 = await insert_dummy(DUMMY_PLAYER7, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER7.data})
    player_id_8 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})

    player_id_9 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_10 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_11 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_12 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_13 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_14 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_15 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})
    player_id_16 = await insert_dummy(DUMMY_PLAYER8, PlayerId, {"tournament_id": tournament_id_1, "club_id": club_id_1, "data": DUMMY_PLAYER8.data})

    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_1, "team_id": team_id_1}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_2, "team_id": team_id_1}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_3, "team_id": team_id_2}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_4, "team_id": team_id_2}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_5, "team_id": team_id_3}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_6, "team_id": team_id_3}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_7, "team_id": team_id_4}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_8, "team_id": team_id_4}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_9, "team_id": team_id_5}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_10, "team_id": team_id_5}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_11, "team_id": team_id_6}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_12, "team_id": team_id_6}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_13, "team_id": team_id_7}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_14, "team_id": team_id_7}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_15, "team_id": team_id_8}
    )
    await insert_dummy(
        DUMMY_PLAYER_X_TEAM, PlayerXTeamId, {"player_id": player_id_16, "team_id": team_id_8}
    )

    await insert_dummy(DUMMY_COURT1, CourtId, {"tournament_id": tournament_id_1})
    await insert_dummy(DUMMY_COURT2, CourtId, {"tournament_id": tournament_id_1})

    return user_id_1
